import uuid
import traceback
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from typing import List
from core.security import get_current_user, service_supabase
from core.config import settings
from tasks.document_tasks import process_document

router = APIRouter(prefix="/documents", tags=["Documents"])
security = HTTPBearer()

@router.get("/status")
async def get_document_status(
    ids: str = Query(..., description="Comma-separated document IDs"),
    user = Depends(get_current_user)
):
    """Poll processing status for a list of document IDs."""
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if not id_list:
        return []
    resp = service_supabase.table("documents") \
        .select("id, title, processing_status") \
        .in_("id", id_list) \
        .eq("user_id", user.id) \
        .execute()
    return resp.data or []


# Service-role client: bypasses RLS for server-side storage operations.
# Safe because we authenticate the user ourselves via get_current_user.
_service_client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user = Depends(get_current_user)
):
    try:
        # Generate unique path: {user_id}/{uuid}.{ext}
        file_ext = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = f"{user.id}/{unique_filename}"

        # Read file content
        file_content = await file.read()

        # Upload to Supabase Storage using service client (bypasses RLS)
        # The user is already verified by get_current_user above
        _service_client.storage.from_("documents").upload(
            file_path,
            file_content,
            {"content-type": file.content_type}
        )

        # Create database record using a user-scoped client so DB RLS still applies
        user_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        user_client.postgrest.auth(credentials.credentials)

        doc_data = {
            "user_id": user.id,
            "title": file.filename,
            "file_path": file_path,
            "file_type": file.content_type,
            "processing_status": "pending"
        }
        db_res = user_client.table("documents").insert(doc_data).execute()
        doc_id = db_res.data[0]['id']

        # Trigger Celery Task
        process_document.delay(doc_id)

        return {
            "message": "File uploaded successfully. Processing started.",
            "document_id": doc_id
        }

    except Exception as e:
        print("UPLOAD ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
