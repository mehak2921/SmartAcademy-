from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from core.security import get_current_user, service_supabase
from agents.orchestrator import llm, get_document_context, get_web_context, FlashcardOutput

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

class GenerateFlashcardsRequest(BaseModel):
    topic: Optional[str] = None
    active_documents: Optional[List[str]] = []
    count: int = 10

@router.post("/generate")
async def generate_flashcards(request: GenerateFlashcardsRequest, user=Depends(get_current_user)):
    try:
        context = ""
        if request.active_documents:
            doc_context, is_ready = get_document_context(request.active_documents)
            if not is_ready:
                return {"error": "Processing", "message": "Document is still being processed."}
            context = f"\n\nRelevant document context:\n{doc_context}"
        elif request.topic:
            web_context = get_web_context(request.topic)
            if web_context:
                context = f"\n\nRelevant web context:\n{web_context}"
        
        if not context:
            raise HTTPException(400, "Could not retrieve context for the flashcards.")
            
        count = min(request.count, 30) # Max 30 flashcards
            
        llm_structured = llm.with_structured_output(FlashcardOutput)
        prompt = (
            f"Create exactly {count} high-quality educational flashcards based on the context below.\n"
            "Rules for Flashcards:\n"
            "1. 'front': Must be a specific key term, concept, or entity (e.g., 'Neural Networks', 'Photosynthesis'). Do NOT use questions (e.g., 'What is...'). Keep it short (1-4 words).\n"
            "2. 'back': Must be a detailed, comprehensive explanation or definition of the concept on the front.\n            3. Is it study material? If the document is a resume, CV, or non-educational text, set `is_valid_study_material=False` and return empty flashcards.\n"
            "STRICTLY base the flashcards on the context provided below. Do NOT invent concepts outside the context.\n"
            "You MUST output valid JSON matching the requested schema.\n"
            f"--- Context ---\n{context}"
        )
        
        result = llm_structured.invoke(prompt)
        
        is_valid = result.get("is_valid_study_material", True) if isinstance(result, dict) else getattr(result, "is_valid_study_material", True)
        if not is_valid:
            raise HTTPException(400, "I cannot generate flashcards for this type of document (e.g. resumes, CVs). Please upload educational or study material.")
        
        result_title = result.get("title", "Flashcards") if isinstance(result, dict) else result.title
        result_flashcards = result.get("flashcards", []) if isinstance(result, dict) else result.flashcards
        
        # Save to Chat Sessions for history
        try:
            sess = service_supabase.table("chat_sessions").insert({
                "user_id": user.id,
                "title": f"Flashcards: {result_title}",
            }).execute()
            session_id = sess.data[0]["id"]
            
            # Format markdown
            markdown_content = f"### {result_title}\n\n"
            for f in result_flashcards:
                f_front = f.get("front", "") if isinstance(f, dict) else f.front
                f_back = f.get("back", "") if isinstance(f, dict) else f.back
                markdown_content += f"**Front:** {f_front}\n**Back:** {f_back}\n\n"
                
            user_msg = "Generate flashcards for the uploaded document." if request.active_documents else f"Generate flashcards about {request.topic}."
            
            service_supabase.table("chat_messages").insert([
                {"session_id": session_id, "role": "user", "content": user_msg},
                {"session_id": session_id, "role": "assistant", "content": markdown_content}
            ]).execute()
        except Exception as e:
            print("Failed to save flashcards history to chat session:", e)
            
        return result if isinstance(result, dict) else result.dict()
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))




