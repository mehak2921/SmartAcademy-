import os
import pandas as pd
from dotenv import load_dotenv

# Ragas and Langchain imports
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import context_recall, context_precision, answer_relevancy, faithfulness
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

# Import our backend components
from rag.retrieval import get_retriever
from rag.ingestion import embeddings
from core.security import service_supabase as supabase
from agents.orchestrator import llm # Use our ChatGroq instance

load_dotenv()

from ragas.llms.base import LangchainLLMWrapper
# Initialize LLM for evaluation (RAGAS requires wrapping langchain models)
# We use bypass_n=True because Groq does not support generating multiple completions at once
eval_llm = LangchainLLMWrapper(llm, bypass_n=True)
eval_embeddings = embeddings

# Define test dataset (Replace these with your actual test questions and ground truth answers based on your documents)
# You can also fetch chunks from the DB and use an LLM to generate test questions.
print("Fetching some document chunks from the database to create test data...")
res = supabase.table("document_chunks").select("content").limit(2).execute()
if not res.data:
    print("No documents found in the database. Please upload a document first.")
    exit()

sample_content = res.data[0]["content"]

# Generate a synthetic question and ground truth from this chunk
prompt = f"Generate a single clear question based on the following text, and provide the exact answer based ONLY on the text. Format: Q: <question>\nA: <answer>\n\nText: {sample_content}"
qa_res = llm.invoke(prompt).content
q_part = qa_res.split("A:")[0].replace("Q:", "").strip()
a_part = qa_res.split("A:")[1].strip()

questions = [q_part]
ground_truths = [a_part]

# Prepare lists for RAGAS dataset
answers = []
contexts = []

print("Running test queries through the RAG pipeline...")
from langchain_core.documents import Document
class DirectRetriever:
    def invoke(self, query):
        res = supabase.table("document_chunks").select("content").limit(3).execute()
        return [Document(page_content=r["content"]) for r in res.data]

retriever = DirectRetriever()

for q in questions:
    print(f"Query: {q}")
    # 1. Retrieve contexts
    docs = retriever.invoke(q)
    context_list = [doc.page_content for doc in docs]
    contexts.append(context_list)
    
    # 2. Generate answer using our standard chat setup (mocking the orchestrator)
    sys_prompt = SystemMessage(content="You are a helpful assistant. Use the following context to answer the question:\n" + "\n".join(context_list))
    user_msg = HumanMessage(content=q)
    response = llm.invoke([sys_prompt, user_msg])
    answers.append(response.content)

# Create HuggingFace dataset format required by Ragas
data = {
    "question": questions,
    "answer": answers,
    "contexts": contexts,
    "ground_truth": ground_truths
}

dataset = Dataset.from_dict(data)

print("\nStarting RAGAS Evaluation (this may take a minute)...")
# Note: we pass our Langchain LLM and Embeddings so it uses Groq instead of OpenAI
result = evaluate(
    dataset,
    metrics=[
        context_precision,
        context_recall,
        faithfulness,
        answer_relevancy,
    ],
    llm=eval_llm,
    embeddings=eval_embeddings
)

print("\n=== RAGAS Evaluation Results ===")
print(result)

# Output as pandas dataframe for better readability
df = result.to_pandas()
print("\nDetailed breakdown:")
if "user_input" in df.columns:
    print(df[["user_input", "context_precision", "context_recall", "faithfulness", "answer_relevancy"]])
else:
    print(df[["question", "context_precision", "context_recall", "faithfulness", "answer_relevancy"]])
df.to_csv("ragas_evaluation_results.csv", index=False)
print("Results saved to ragas_evaluation_results.csv")
