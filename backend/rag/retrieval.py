from langchain_community.vectorstores import SupabaseVectorStore
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
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

# Setup BAAI Reranker
reranker_model = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-v2-m3")
compressor = CrossEncoderReranker(model=reranker_model, top_n=5)

def get_retriever(document_ids: list[str] = None):
    """
    Returns a retriever that performs vector search on Supabase 
    and then reranks the results using BAAI bge-reranker.
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
    
    # Advanced Retrieval: Contextual Compression (Reranking)
    compression_retriever = ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=base_retriever
    )
    
    return compression_retriever
