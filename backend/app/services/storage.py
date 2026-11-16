import os
import re
import uuid
import logging
from typing import BinaryIO
from app.config import settings

logger = logging.getLogger("app.services.storage")

# Try to initialize the GCS client
try:
    from google.cloud import storage
    gcs_client = storage.Client(project=settings.GCP_PROJECT_ID)
    HAS_GCS = True
    logger.info("GCS client initialized successfully.")
except Exception as e:
    logger.warning(f"Could not initialize GCS client ({e}). Running in Local Storage Mode.")
    gcs_client = None
    HAS_GCS = False

# Ensure local upload directory exists
os.makedirs(settings.LOCAL_UPLOAD_DIR, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename to prevent directory traversal and special character exploits."""
    base = os.path.basename(filename)
    # Remove all dangerous characters except alphanumeric, dash, dot, and underscore
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
    # Ensure it's not empty
    if not clean or clean.startswith('.'):
        clean = f"document_{uuid.uuid4().hex[:8]}.pdf"
    return clean


def upload_file(file_obj: BinaryIO, raw_filename: str) -> str:
    """
    Uploads a file to GCS (if available) or saves it locally.
    Returns the file path (either gcs gs:// URI or local file system path).
    Enforces path traversal protection and secure filename generation.
    """
    safe_name = sanitize_filename(raw_filename)
    unique_prefix = uuid.uuid4().hex[:8]
    stored_filename = f"{unique_prefix}_{safe_name}"

    if HAS_GCS and gcs_client:
        try:
            bucket = gcs_client.get_bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(stored_filename)
            file_obj.seek(0)
            blob.upload_from_file(file_obj)
            gcs_path = f"gs://{settings.GCS_BUCKET_NAME}/{stored_filename}"
            logger.info(f"File {stored_filename} uploaded to GCS at {gcs_path}")
            return gcs_path
        except Exception as e:
            logger.error(f"GCS upload failed: {e}. Falling back to local file storage.")
    
    # Local fallback with path traversal protection
    local_path = os.path.abspath(os.path.join(settings.LOCAL_UPLOAD_DIR, stored_filename))
    upload_dir_abs = os.path.abspath(settings.LOCAL_UPLOAD_DIR)
    
    if not local_path.startswith(upload_dir_abs):
        raise ValueError(f"Path traversal attempt detected in filename: {raw_filename}")
        
    file_obj.seek(0)
    with open(local_path, "wb") as f:
        f.write(file_obj.read())
        
    logger.info(f"File {stored_filename} saved locally to {local_path}")
    return local_path
