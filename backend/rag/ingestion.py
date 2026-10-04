from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
from core.security import service_supabase as supabase
import os

# Use Hugging Face's Free Cloud API instead of downloading the model locally
embeddings = HuggingFaceInferenceAPIEmbeddings(
    api_key=os.getenv("HF_TOKEN", ""),
    model_name="BAAI/bge-base-en-v1.5"
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,
    chunk_overlap=200,
    separators=["\n\n", "\n", " ", ""]
)

def chunk_and_embed_document(document_id: str, text: str):
    """
    Splits the parsed text into chunks, generates embeddings, 
    and stores them in the pgvector enabled Supabase table.
    """
    chunks = text_splitter.split_text(text)
    if not chunks:
        return
        
    vectors = embeddings.embed_documents(chunks)
    
    records = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        records.append({
            "document_id": document_id,
            "content": chunk,
            "embedding": vector,
            "metadata": {
                "chunk_index": i
            }
        })
    
    # Batch insert to supabase pgvector
    if records:
        supabase.table("document_chunks").insert(records).execute()
        
    return len(records)
