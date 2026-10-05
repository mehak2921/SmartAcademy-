from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from core.security import get_current_user, service_supabase
from agents.orchestrator import orchestrator
from langchain_core.messages import HumanMessage, AIMessage
import uuid
import json

router = APIRouter(prefix="/chat", tags=["Chat"])

# ─── Pydantic models ────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    current_topic: Optional[str] = None
    active_documents: Optional[List[dict]] = []
    session_id: Optional[str] = None   # pass existing session to continue it

class WidgetRequest(BaseModel):
    session_id: Optional[str] = None
    widget_type: str
    widget_data: dict
    title: Optional[str] = None

# ─── Session CRUD ────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    """Return all chat sessions for the current user, newest first."""
    resp = service_supabase.table("chat_sessions") \
        .select("id, title, created_at, updated_at") \
        .eq("user_id", user.id) \
        .order("updated_at", desc=True) \
        .limit(50) \
        .execute()
    return resp.data or []


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    """Return a single session with its messages."""
    sess = service_supabase.table("chat_sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("user_id", user.id) \
        .limit(1) \
        .execute()
        
    if not sess.data:
        raise HTTPException(404, "Session not found")
        
    session_data = sess.data[0]

    msgs = service_supabase.table("chat_messages") \
        .select("role, content, created_at") \
        .eq("session_id", session_id) \
        .order("created_at") \
        .execute()

    # Extract active documents from special system message
    active_docs = []
    filtered_msgs = []
    if msgs.data:
        for m in msgs.data:
            if m["role"] == "system" and m["content"].startswith("__ACTIVE_DOCS__:"):
                try:
                    active_docs = json.loads(m["content"].split(":", 1)[1])
                except Exception:
                    pass
            elif m["role"] == "assistant" and m["content"].startswith("__WIDGET__:"):
                try:
                    parts = m["content"].split(":", 2)
                    w_type = parts[1]
                    w_json = json.loads(parts[2])
                    filtered_msgs.append({
                        "role": "assistant",
                        "type": w_type,
                        "content": w_json,
                        "created_at": m["created_at"]
                    })
                except Exception:
                    filtered_msgs.append(m)
            else:
                filtered_msgs.append(m)

    return {**session_data, "messages": filtered_msgs, "active_documents": active_docs}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    service_supabase.table("chat_messages").delete().eq("session_id", session_id).execute()
    service_supabase.table("chat_sessions").delete() \
        .eq("id", session_id).eq("user_id", user.id).execute()
    return {"ok": True}

# ─── Main chat endpoint ──────────────────────────────────────────────────────

@router.post("/")
async def chat_endpoint(request: ChatRequest, user=Depends(get_current_user)):
    try:
        # Build or retrieve session
        session_id = request.session_id
        if not session_id:
            # Create new session; title = first user message (truncated)
            first_user = next((m.content for m in request.messages if m.role == "user"), "New Chat")
            
            title = "New Chat"
            if first_user != "New Chat":
                try:
                    from pydantic import BaseModel
                    class SessionTitle(BaseModel):
                        title: str
                    
                    from agents.orchestrator import llm
                    title_llm = llm.with_structured_output(SessionTitle, method="json_mode")
                    
                    context_str = f"Topic: {request.current_topic}. " if request.current_topic else ""
                    docs_str = f"Documents: {[d.get('name', 'Document') for d in request.active_documents]}. " if request.active_documents else ""
                    
                    prompt = f"Generate a highly concise 3-5 word title for this chat session based on its main topic or content. {context_str}{docs_str}User's first message: '{first_user}'"
                    
                    title_res = title_llm.invoke(prompt)
                    title = title_res.title
                except Exception as e:
                    print("Failed to generate title:", e)
                    title = first_user[:60] + ("…" if len(first_user) > 60 else "")
                    
            sess = service_supabase.table("chat_sessions").insert({
                "user_id": user.id,
                "title": title,
            }).execute()
            session_id = sess.data[0]["id"]
        else:
            # Touch updated_at
            service_supabase.table("chat_sessions") \
                .update({"updated_at": "now()"}) \
                .eq("id", session_id) \
                .execute()

        # Convert to LangChain messages
        langchain_messages = []
        for msg in request.messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                langchain_messages.append(AIMessage(content=msg.content))

        # Run orchestrator
        state = {
            "messages": langchain_messages,
            "current_topic": request.current_topic or "",
            "active_documents": [d.get("id") for d in request.active_documents] if request.active_documents else [],
            "next_node": "intent_router",
        }
        final_state = orchestrator.invoke(state)
        last_message = final_state["messages"][-1]

        # Persist the last user message + AI response
        last_user = next((m.content for m in reversed(request.messages) if m.role == "user"), None)
        rows = []
        if last_user:
            rows.append({"session_id": session_id, "role": "user", "content": last_user})
        rows.append({"session_id": session_id, "role": "assistant", "content": last_message.content})
        
        if request.active_documents:
            # Delete old active docs marker for this session to keep it clean
            service_supabase.table("chat_messages").delete() \
                .eq("session_id", session_id).eq("role", "system").like("content", "__ACTIVE_DOCS__:%").execute()
            
            docs_json = json.dumps(request.active_documents)
            rows.append({"session_id": session_id, "role": "system", "content": f"__ACTIVE_DOCS__:{docs_json}"})

        service_supabase.table("chat_messages").insert(rows).execute()

        return {
            "response": last_message.content,
            "session_id": session_id,
            "topic": final_state.get("current_topic"),
        }

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/widget")
async def save_widget(request: WidgetRequest, user=Depends(get_current_user)):
    try:
        session_id = request.session_id
        if not session_id:
            sess = service_supabase.table("chat_sessions").insert({
                "user_id": user.id,
                "title": request.title or f"Generated {request.widget_type.capitalize()}",
            }).execute()
            session_id = sess.data[0]["id"]
        else:
            service_supabase.table("chat_sessions").update({"updated_at": "now()"}).eq("id", session_id).execute()

        content_str = f"__WIDGET__:{request.widget_type}:{json.dumps(request.widget_data)}"
        
        service_supabase.table("chat_messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": content_str
        }).execute()
        
        return {"session_id": session_id}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

