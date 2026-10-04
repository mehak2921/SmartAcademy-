import os
import sys
import tempfile
from celery.utils.log import get_task_logger
from .celery_app import celery_app
from core.security import service_supabase as supabase
from services.document_parser import DocumentParser

# Ensure the backend root is on the path so 'rag' is importable by gevent workers
_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from rag.ingestion import chunk_and_embed_document

logger = get_task_logger(__name__)

@celery_app.task(name="process_document")
def process_document(document_id: str):
    logger.info(f"Starting processing for document {document_id}")
    
    try:
        # Fetch document metadata
        doc_resp = supabase.table("documents").select("*").eq("id", document_id).single().execute()
        if not doc_resp.data:
            logger.error(f"Document {document_id} not found")
            return
        
        doc_data = doc_resp.data
        file_path = doc_data['file_path']
        file_type = doc_data['file_type']
        
        # Download file from Supabase Storage
        logger.info(f"Downloading {file_path}")
        bucket_name = "documents" # Assuming a bucket named 'documents'
        res = supabase.storage.from_(bucket_name).download(file_path)
        
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            tmp_file.write(res)
            tmp_file_path = tmp_file.name
            
        # Parse document
        logger.info(f"Parsing {file_type} document")
        parsed_text = DocumentParser.parse_file(tmp_file_path, file_type)
        
        # Cleanup temp file
        os.remove(tmp_file_path)
        
        # Chunking and Vectorizing
        logger.info(f"Chunking and embedding {len(parsed_text)} characters for document {document_id}")
        chunks_created = chunk_and_embed_document(document_id, parsed_text)
        
        # Update status to completed
        supabase.table("documents").update({"processing_status": "completed"}).eq("id", document_id).execute()
        logger.info(f"Document {document_id} processing complete. Chunks created: {chunks_created}")
        
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {str(e)}")
        supabase.table("documents").update({"processing_status": "failed"}).eq("id", document_id).execute()
        raise e
