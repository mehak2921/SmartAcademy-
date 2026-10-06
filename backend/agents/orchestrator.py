from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_community.utilities import GoogleSerperAPIWrapper
from pydantic import BaseModel, Field
from models.schemas import QuizOutput, FlashcardOutput, SummaryOutput, StudyPlanOutput, ConceptsOutput, ResourcesOutput
from dotenv import load_dotenv
from core.security import service_supabase
from datetime import datetime

load_dotenv()

llm = ChatGroq(model_name="openai/gpt-oss-120b", temperature=0)
search = GoogleSerperAPIWrapper()

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    current_topic: str
    active_documents: List[str]
    next_node: str

# ---------------------------------------------------------------------------
# Pydantic output schemas
# ---------------------------------------------------------------------------

class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question")
    options: List[str] = Field(description="List of 4 multiple choice options")
    answer: str = Field(description="The correct answer from the options")

class QuizOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title of the quiz", default="Quiz")
    questions: List[QuizQuestion] = Field(description="List of questions")

class StudyPlanTask(BaseModel):
    day: str = Field(description="Day of the week or Date (e.g. Day 1, Monday)")
    topic: str = Field(description="The topic to study")
    duration: str = Field(description="Suggested duration (e.g. '1 hour')")

class StudyPlanOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title of the study plan", default="Study Plan")
    tasks: List[StudyPlanTask] = Field(description="List of daily tasks")

class Flashcard(BaseModel):
    front: str = Field(description="The concept or term to be tested on the front of the flashcard")
    back: str = Field(description="The definition or explanation on the back of the flashcard")

class FlashcardOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title for the flashcard deck", default="Flashcards")
    flashcards: List[Flashcard] = Field(description="List of flashcards")

class SummaryOutput(BaseModel):
    title: str = Field(description="Title of the summary", default="Summary")
    summary: str = Field(description="The detailed summary markdown text with headings and bullet points")

class Concept(BaseModel):
    name: str = Field(description="The name of the concept")
    explanation: str = Field(description="Detailed explanation of the concept")

class ConceptsOutput(BaseModel):
    title: str = Field(description="Title for the concepts", default="Key Concepts")
    concepts: List[Concept] = Field(description="List of extracted concepts")

class Resource(BaseModel):
    title: str = Field(description="Title of the resource")
    url: str = Field(description="URL to the resource (if applicable) or 'N/A'")
    type: str = Field(description="Type of resource (e.g., Video, Article, Book)")
    description: str = Field(description="Brief description of the resource")

class ResourcesOutput(BaseModel):
    title: str = Field(description="Title for the resources list", default="Learning Resources")
    resources: List[Resource] = Field(description="List of recommended learning resources")

# ---------------------------------------------------------------------------
# Document context helper
# ---------------------------------------------------------------------------

def get_document_context(document_ids: List[str]) -> tuple[str, bool]:
    """
    Fetches document chunks directly by document_id.
    Returns (context_string, is_ready).
    is_ready=False means the document is still processing or not found.
    """
    if not document_ids:
        return "", False

    # Check processing status
    status_resp = service_supabase.table("documents") \
        .select("id, processing_status, title") \
        .in_("id", document_ids) \
        .execute()

    if not status_resp.data:
        return "", False

    pending = [d for d in status_resp.data if d["processing_status"] != "completed"]
    if pending:
        titles = ", ".join(d["title"] for d in pending)
        return f"__PROCESSING__:{titles}", False

    # Fetch chunks directly filtered by document_id
    chunks_resp = service_supabase.table("document_chunks") \
        .select("content") \
        .in_("document_id", document_ids) \
        .limit(15) \
        .execute()

    if not chunks_resp.data:
        return "", True  # Processed but no chunks found yet

    context = "\n\n--- Document Content ---\n" + "\n\n".join(
        chunk["content"] for chunk in chunks_resp.data
    )
    return context, True

def _processing_message(context: str) -> str:
    titles = context.split(":", 1)[1]
    return f"⏳ **Document is still being processed:** *{titles}*\n\nPlease wait 30–60 seconds and try again."

def get_web_context(topic: str) -> str:
    """Fallback to web search when no documents are provided."""
    try:
        results = search.run(topic)
        return f"\n\n--- Web Search Results ---\n{results}"
    except Exception as e:
        print("Web search failed:", e)
        return ""


def get_chat_history_context(state: AgentState) -> str:
    history = []
    for m in state["messages"][:-1]:
        role = "User" if m.type == "human" else "AI"
        history.append(f"{role}: {m.content}")
    if not history: return ""
    return "\n\n--- Conversation History ---\n" + "\n".join(history[-10:])

# ---------------------------------------------------------------------------# Agents
# ---------------------------------------------------------------------------

def intent_router(state: AgentState) -> dict:
    last_message = state["messages"][-1].content.lower()
    if "summary" in last_message or "summarize" in last_message:
        return {"next_node": "summary_agent"}
    elif "quiz" in last_message or "test" in last_message:
        return {"next_node": "quiz_agent"}
    elif "plan" in last_message or "schedule" in last_message:
        return {"next_node": "study_plan_agent"}
    elif "flashcard" in last_message:
        return {"next_node": "flashcards_agent"}
    elif "concept" in last_message:
        return {"next_node": "concepts_agent"}
    elif "resource" in last_message:
        return {"next_node": "resources_agent"}
    elif any(w in last_message for w in ["translate", "in spanish", "in french", "in hindi", "in punjabi"]):
        return {"next_node": "translation_agent"}
    else:
        return {"next_node": "chat_agent"}

def chat_agent(state: AgentState) -> dict:
    current_date = datetime.now().strftime("%B %d, %Y")
    context = ""
    if state.get("active_documents"):
        doc_context, is_ready = get_document_context(state["active_documents"])
        if is_ready and doc_context:
            context = f"\n\nRelevant document context:\n{doc_context}"

    system_prompt = SystemMessage(content=(
        f"You are Smart Academy AI, a helpful educational assistant. Today's date is {current_date}."
        f"{context}"
    ))
    response = llm.invoke([system_prompt] + state["messages"][-10:])
    return {"messages": [response]}

def summary_agent(state: AgentState) -> dict:
    if not state.get("active_documents"):
        topic = state.get("current_topic") or state["messages"][-1].content
        context = get_web_context(topic)
        if not context:
            return {"messages": [AIMessage(content="Please upload a document first using the **+** button, or provide a clearer topic.")]}
    else:
        context, is_ready = get_document_context(state["active_documents"])
        if not is_ready:
            msg = _processing_message(context) if context.startswith("__PROCESSING__:") else "No document content found. Please re-upload the document."
            return {"messages": [AIMessage(content=msg)]}

    llm_structured = llm.with_structured_output(SummaryOutput, method="json_mode")
    prompt = (
        "Generate a comprehensive, accurate summary STRICTLY based on the context provided below. "
        "Do NOT add any information not present in the context. "
        "You MUST output valid JSON matching the requested schema. For concepts, the array MUST be named exactly `concepts` (not `key_concepts`). For study plan, it MUST be `tasks`.\\n"
        f"Request: {state['messages'][-1].content}\n"
        f"{get_chat_history_context(state)}\n"
        f"{context}"
    )
    try:
        result = llm_structured.invoke(prompt)
        import json
        return {"messages": [AIMessage(content=f"__WIDGET__:summary:{json.dumps(result.dict() if not isinstance(result, dict) else result)}")]}
    except Exception as e:
        return {"messages": [AIMessage(content="Sorry, I had trouble generating this summary. Please try again with a clearer topic.")]}

def quiz_agent(state: AgentState) -> dict:
    if not state.get("active_documents"):
        topic = state.get("current_topic") or state["messages"][-1].content
        context = get_web_context(topic)
        if not context:
            return {"messages": [AIMessage(content="Please upload a document first, then click **Quiz** on the document card.")]}
    else:
        context, is_ready = get_document_context(state["active_documents"])
        if not is_ready:
            msg = _processing_message(context) if context.startswith("__PROCESSING__:") else "No document content found. Please re-upload the document."
            return {"messages": [AIMessage(content=msg)]}

    llm_structured = llm.with_structured_output(QuizOutput, method="json_mode")
    prompt = (
        "Create a multiple choice quiz STRICTLY based on the context below.\n" + "1. Is it study material? If the document is a resume, CV, or non-educational text, set `is_valid_study_material=False` and return empty questions.\n" + "2. QUANTITY: If the user explicitly asks for a specific NUMBER of questions (e.g., '1 quiz question', 'generate 2 questions'), you MUST generate EXACTLY that number. Do not ignore the user's requested number! If not specified, default to 5.\n"
        "Do NOT invent questions outside the context. "
        "You MUST output valid JSON matching the requested schema. For concepts, the array MUST be named exactly `concepts` (not `key_concepts`). For study plan, it MUST be `tasks`.\\n"
        f"Request: {state['messages'][-1].content}\n"
        f"{get_chat_history_context(state)}\n"
        f"{context}"
    )
    try:
        result = llm_structured.invoke(prompt)
        if not getattr(result, "is_valid_study_material", True): return {"messages": [AIMessage(content="I cannot generate a quiz for this type of document. Please upload educational material.")]}
        import json
        return {"messages": [AIMessage(content=f"__WIDGET__:quiz:{json.dumps(result.dict() if not isinstance(result, dict) else result)}")]}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"messages": [AIMessage(content="Sorry, I had trouble generating this quiz. Please try again with a clearer topic.")]}

def study_plan_agent(state: AgentState) -> dict:
    if not state.get("active_documents"):
        topic = state.get("current_topic") or state["messages"][-1].content
        context = get_web_context(topic)
        if not context:
            return {"messages": [AIMessage(content="Please upload a document first, then click **Study Plan** on the document card.")]}
    else:
        context, is_ready = get_document_context(state["active_documents"])
        if not is_ready:
            msg = _processing_message(context) if context.startswith("__PROCESSING__:") else "No document content found. Please re-upload the document."
            return {"messages": [AIMessage(content=msg)]}

    llm_structured = llm.with_structured_output(StudyPlanOutput, method="json_mode")
    prompt = (
        "Create a structured study plan STRICTLY based on the context below.\n" + "1. Is it study material? If the document is a resume, CV, or non-educational text, set `is_valid_study_material=False` and return empty tasks.\n" + "2. QUANTITY: If the user explicitly asks for a specific NUMBER of items, you MUST generate EXACTLY that number. Do not ignore the user's requested number! If not specified, default to 5.\n"
        "You MUST output valid JSON matching the requested schema. For concepts, the array MUST be named exactly `concepts` (not `key_concepts`). For study plan, it MUST be `tasks`.\\n"
        f"Request: {state['messages'][-1].content}\n"
        f"{get_chat_history_context(state)}\n"
        f"{context}"
    )
    try:
        result = llm_structured.invoke(prompt)
    import json
    try:
        data = result.dict() if not isinstance(result, dict) else result
        return {"messages": [AIMessage(content=f"__WIDGET__:study_plan:{json.dumps(data)}")]}
    except Exception as e:
        return {"messages": [AIMessage(content="Sorry, I had trouble generating study_plan. Please try again.")]}
        import json
        return {"messages": [AIMessage(content=f"__WIDGET__:study_plan:{json.dumps(result.dict() if not isinstance(result, dict) else result)}")]}
    except Exception as e:
        return {"messages": [AIMessage(content="Sorry, I had trouble generating this study plan. Please try again with a clearer topic.")]}

def flashcards_agent(state: AgentState) -> dict:
    if not state.get("active_documents"):
        topic = state.get("current_topic") or state["messages"][-1].content
        context = get_web_context(topic)
        if not context:
            return {"messages": [AIMessage(content="Please upload a document first, then click **Flashcards** on the document card.")]}
    else:
        context, is_ready = get_document_context(state["active_documents"])
        if not is_ready:
            msg = _processing_message(context) if context.startswith("__PROCESSING__:") else "No document content found. Please re-upload the document."
            return {"messages": [AIMessage(content=msg)]}

    llm_structured = llm.with_structured_output(FlashcardOutput, method="json_mode")
    prompt = (
        "Create a set of flashcards STRICTLY based on the context below. " + "Each flashcard should have a clear 'front' (term/concept) and 'back' (definition/explanation).\n" + "1. Is it study material? If the document is a resume, CV, or non-educational text, set `is_valid_study_material=False` and return empty flashcards.\n" + "2. QUANTITY: If the user explicitly asks for a specific NUMBER of flashcards (e.g., '1 flashcard', 'generate 2 flashcards'), you MUST generate EXACTLY that number. Do not ignore the user's requested number! If not specified, default to 5.\n"
        "You MUST output valid JSON matching the requested schema. For concepts, the array MUST be named exactly `concepts` (not `key_concepts`). For study plan, it MUST be `tasks`.\\n"
        f"Request: {state['messages'][-1].content}\n"
        f"{get_chat_history_context(state)}\n"
        f"{context}"
    )
    try:
        result = llm_structured.invoke(prompt)
        if not getattr(result, "is_valid_study_material", True): return {"messages": [AIMessage(content="I cannot generate flashcards for this type of document. Please upload educational material.")]}
        import json
        return {"messages": [AIMessage(content=f"__WIDGET__:flashcards:{json.dumps(result.dict() if not isinstance(result, dict) else result)}")]}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"messages": [AIMessage(content="Sorry, I had trouble generating flashcards. Please try again with a clearer topic.")]}

def translation_agent(state: AgentState) -> dict:
    prompt = f"You are a translation assistant. Translate the following request and respond appropriately:\n\n{state['messages'][-1].content}"
    response = llm.invoke(prompt)
    return {"messages": [response]}

def concepts_agent(state: AgentState) -> dict:
    if not state.get("active_documents"):
        topic = state.get("current_topic") or state["messages"][-1].content
        context = get_web_context(topic)
        if not context:
            return {"messages": [AIMessage(content="Please upload a document first, then click **Concepts** on the home page.")]}
    else:
        context, is_ready = get_document_context(state["active_documents"])
        if not is_ready:
            msg = _processing_message(context) if context.startswith("__PROCESSING__:") else "No document content found. Please re-upload the document."
            return {"messages": [AIMessage(content=msg)]}

    llm_structured = llm.with_structured_output(ConceptsOutput, method="json_mode")
    prompt = (
        "Extract the most important key concepts from the context below and explain them clearly. "
        "You MUST output valid JSON matching the requested schema. For concepts, the array MUST be named exactly `concepts` (not `key_concepts`). For study plan, it MUST be `tasks`.\\n"
        f"Request: {state['messages'][-1].content}\n"
        f"{get_chat_history_context(state)}\n"
        f"{context}"
    )
    result = llm_structured.invoke(prompt)
    import json
    try:
        data = result.dict() if not isinstance(result, dict) else result
        return {"messages": [AIMessage(content=f"__WIDGET__:concepts:{json.dumps(data)}")]}
    except Exception as e:
        return {"messages": [AIMessage(content="Sorry, I had trouble generating concepts. Please try again.")]}

def resources_agent(state: AgentState) -> dict:
    if not state.get("active_documents"):
        topic = state.get("current_topic") or state["messages"][-1].content
        context = get_web_context(topic)
        if not context:
            return {"messages": [AIMessage(content="Please upload a document first, then click **Resources** on the home page.")]}
    else:
        context, is_ready = get_document_context(state["active_documents"])
        if not is_ready:
            msg = _processing_message(context) if context.startswith("__PROCESSING__:") else "No document content found. Please re-upload the document."
            return {"messages": [AIMessage(content=msg)]}

    llm_structured = llm.with_structured_output(ResourcesOutput, method="json_mode")
    prompt = (
        "Recommend high-quality learning resources (videos, articles, books, courses) related to the topics in the context below. "
        "You MUST output valid JSON matching the requested schema. For concepts, the array MUST be named exactly `concepts` (not `key_concepts`). For study plan, it MUST be `tasks`.\\n"
        f"Request: {state['messages'][-1].content}\n"
        f"{get_chat_history_context(state)}\n"
        f"{context}"
    )
    result = llm_structured.invoke(prompt)
    import json
    try:
        data = result.dict() if not isinstance(result, dict) else result
        return {"messages": [AIMessage(content=f"__WIDGET__:resources:{json.dumps(data)}")]}
    except Exception as e:
        return {"messages": [AIMessage(content="Sorry, I had trouble generating resources. Please try again.")]}

# ---------------------------------------------------------------------------
# Build LangGraph
# ---------------------------------------------------------------------------

workflow = StateGraph(AgentState)

workflow.add_node("intent_router", intent_router)
workflow.add_node("chat_agent", chat_agent)
workflow.add_node("summary_agent", summary_agent)
workflow.add_node("quiz_agent", quiz_agent)
workflow.add_node("study_plan_agent", study_plan_agent)
workflow.add_node("flashcards_agent", flashcards_agent)
workflow.add_node("translation_agent", translation_agent)
workflow.add_node("concepts_agent", concepts_agent)
workflow.add_node("resources_agent", resources_agent)

workflow.set_entry_point("intent_router")

workflow.add_conditional_edges(
    "intent_router",
    lambda x: x["next_node"],
    {
        "chat_agent": "chat_agent",
        "summary_agent": "summary_agent",
        "quiz_agent": "quiz_agent",
        "study_plan_agent": "study_plan_agent",
        "flashcards_agent": "flashcards_agent",
        "translation_agent": "translation_agent",
        "concepts_agent": "concepts_agent",
        "resources_agent": "resources_agent",
    }
)

workflow.add_edge("chat_agent", END)
workflow.add_edge("summary_agent", END)
workflow.add_edge("quiz_agent", END)
workflow.add_edge("study_plan_agent", END)
workflow.add_edge("flashcards_agent", END)
workflow.add_edge("translation_agent", END)
workflow.add_edge("concepts_agent", END)
workflow.add_edge("resources_agent", END)

orchestrator = workflow.compile()


















