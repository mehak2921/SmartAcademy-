from langchain_community.vectorstores import SupabaseVectorStore
from core.security import service_supabase as supabase
from rag.ingestion import embeddings
from typing import Any

class CustomSupabaseVectorStore(SupabaseVectorStore):
    def match_args(self, query: list[float], filter: dict[str, Any] | None) -> dict[str, Any]:
        ret = super().match_args(query, filter)
        ret["query_text"] = ""
        ret["match_count"] = 15
        ret["full_text_weight"] = 1.0
        ret["semantic_weight"] = 1.0
        ret["match_threshold"] = 0.0
        return ret

def get_retriever(document_ids: list[str] = None):
    """
    Returns a retriever that performs vector search on Supabase.
    Reranking has been removed for Render free-tier compatibility.
    """
    
    # Base Vector Store Retriever
    vector_store = CustomSupabaseVectorStore(
        client=supabase,
        embedding=embeddings,
        table_name="document_chunks",
        query_name="match_document_chunks", # The postgres function we created
    )
    
    # We can add metadata filtering via a custom wrapper or kwargs
    search_kwargs = {"k": 15}
    if document_ids:
        search_kwargs["filter"] = {"document_id": {"$in": document_ids}}
        
    base_retriever = vector_store.as_retriever(search_kwargs=search_kwargs)
    
    return base_retriever
