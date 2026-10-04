import os
from dotenv import load_dotenv
load_dotenv()
from langchain_groq import ChatGroq
from pydantic import BaseModel

class Eval(BaseModel):
    is_correct: bool
    explanation: str

llm = ChatGroq(model_name='openai/gpt-oss-120b')
eval_llm = llm.with_structured_output(Eval, method='json_mode')
print(eval_llm.invoke('Is the sky blue? Output JSON').dict())
