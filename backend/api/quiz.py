from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional
from core.security import get_current_user, service_supabase
from agents.orchestrator import llm, get_document_context, get_web_context

router = APIRouter(prefix="/quiz", tags=["Quiz"])

class QuizQuestion(BaseModel):
    type: str = Field(description="The type of question: 'MCQ', 'Short QA', 'Long QA', or 'Fill in the blanks'")
    question: str = Field(description="The quiz question")
    options: List[str] = Field(description="List of multiple choice options (only if type is 'MCQ', otherwise empty list)", default_factory=list)
    answer: str = Field(description="The correct answer (for MCQ) or the expected key points/answer (for other types)")

class QuizOutput(BaseModel):
    is_valid_study_material: bool = Field(description="Set to false if the document is a resume, CV, or non-educational.", default=True)
    title: str = Field(description="Title of the quiz", default="Quiz")
    questions: List[QuizQuestion] = Field(description="List of questions")

class GenerateQuizRequest(BaseModel):
    topic: Optional[str] = None
    active_documents: Optional[List[str]] = []
    difficulty: str
    type: str
    count: int

@router.post("/generate")
async def generate_quiz(request: GenerateQuizRequest, user=Depends(get_current_user)):
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
            raise HTTPException(400, "Could not retrieve context for the quiz.")
            
        count = min(request.count, 20) # Max 20
        
        type_instructions = {
            "MCQ": "Generate multiple choice questions. Provide 4 plausible options.",
            "Short QA": "Generate short-answer questions that require a 1-2 sentence conceptual answer. Do NOT provide options.",
            "Long QA": "Generate long-answer/essay questions that require a detailed explanation. Do NOT provide options.",
            "Fill in the blanks": "Generate fill-in-the-blanks questions. The blank should be a critical technical term or concept, NOT a common English word (like 'world' or 'enjoy'). Use '__________' to represent the blank in the question.",
            "Mixed": "Generate a mix of MCQ, Short QA, Long QA, and Fill in the blanks. Follow the rules for each type."
        }
        type_instruction = type_instructions.get(request.type, "")
            
        llm_structured = llm.with_structured_output(QuizOutput)
        prompt = (
            f"Create a {request.difficulty} difficulty educational quiz with exactly {count} questions. "
            f"The requested quiz type is: '{request.type}'.\n"
            f"Instruction for this type: {type_instruction}\n\n"
            "Is it study material? If the document is a resume, CV, or non-educational text, set `is_valid_study_material=False` and return empty questions.\n"
            "STRICTLY base the questions on the context provided below. "
            "Questions must test the user's understanding of core concepts, not trivial grammar. "
            "Do NOT invent questions outside the context. "
            "You MUST output valid JSON matching the requested schema.\n"
            f"{context}"
        )
        
        result = llm_structured.invoke(prompt)
        
        is_valid = result.get("is_valid_study_material", True) if isinstance(result, dict) else getattr(result, "is_valid_study_material", True)
        if not is_valid:
            raise HTTPException(400, "I cannot generate a quiz for this type of document (e.g. resumes, CVs). Please upload educational or study material.")
        
        result_title = result.get("title", "Quiz") if isinstance(result, dict) else result.title
        result_questions = result.get("questions", []) if isinstance(result, dict) else result.questions
        
        # Save to Chat Sessions for history
        try:
            sess = service_supabase.table("chat_sessions").insert({
                "user_id": user.id,
                "title": f"Quiz: {result_title}",
            }).execute()
            session_id = sess.data[0]["id"]
            
            # Format markdown
            markdown_content = f"### {result_title}\n\n"
            for i, q in enumerate(result_questions):
                q_question = q.get("question", "") if isinstance(q, dict) else q.question
                q_options = q.get("options", []) if isinstance(q, dict) else getattr(q, "options", [])
                q_answer = q.get("answer", "") if isinstance(q, dict) else q.answer
                markdown_content += f"**Q{i+1}: {q_question}**\n"
                for opt in q_options:
                    markdown_content += f"- [ ] {opt}\n"
                markdown_content += f"*(Answer: {q_answer})*\n\n"
                
            user_msg = f"Create a {request.difficulty} {request.type} quiz for the uploaded document." if request.active_documents else f"Create a {request.difficulty} {request.type} quiz about {request.topic}."
            
            service_supabase.table("chat_messages").insert([
                {"session_id": session_id, "role": "user", "content": user_msg},
                {"session_id": session_id, "role": "assistant", "content": markdown_content}
            ]).execute()
        except Exception as e:
            print("Failed to save quiz history to chat session:", e)
            
        return result if isinstance(result, dict) else result.dict()
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class EvaluateAnswerRequest(BaseModel):
    question: str
    expected_answer: str
    user_answer: str

class EvaluateAnswerResponse(BaseModel):
    is_correct: bool = Field(description="Whether the user's answer is conceptually correct")
    explanation: str = Field(description="Brief explanation of why it is correct or incorrect, and what the correct answer is if incorrect")

@router.post("/evaluate")
async def evaluate_answer(request: EvaluateAnswerRequest, user=Depends(get_current_user)):
    try:
        eval_llm = llm.with_structured_output(EvaluateAnswerResponse, method="json_mode")
        prompt = (
            "You are an expert tutor. Evaluate the user's answer to the following question.\n"
            f"Question: {request.question}\n"
            f"Expected Answer / Key Points: {request.expected_answer}\n"
            f"User's Answer: {request.user_answer}\n\n"
            "Determine if the user's answer is conceptually correct based on the expected answer. "
            "Be lenient: accept concise, bullet-point, or summarized answers. As long as the core concept is accurate and matches the key points, mark it as correct (true). "
            "Provide a brief, encouraging explanation.\n"
            "You MUST return valid JSON exactly matching this schema: {\"is_correct\": true/false, \"explanation\": \"your explanation\"}"
        )
        result = eval_llm.invoke(prompt)
        return result.dict()
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class SaveQuizRequest(BaseModel):
    title: str
    score: int
    content: dict

@router.post("/save")
async def save_quiz(request: SaveQuizRequest, user=Depends(get_current_user)):
    try:
        res = service_supabase.table("quizzes").insert({
            "user_id": user.id,
            "title": request.title,
            "score": request.score,
            "content": request.content
        }).execute()
        return {"success": True, "quiz_id": res.data[0]["id"]}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



