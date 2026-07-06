import os
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
LOCAL_UPLOAD_DIR = "./uploads"
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


def upload_file(file_obj: BinaryIO, filename: str) -> str:
    """
    Uploads a file to GCS (if available) or saves it locally.
    Returns the file path (either gcs gs:// URI or local file system path).
    """
    if HAS_GCS and gcs_client:
        try:
            bucket = gcs_client.get_bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(filename)
            # Seek file to start just in case
            file_obj.seek(0)
            blob.upload_from_file(file_obj)
            gcs_path = f"gs://{settings.GCS_BUCKET_NAME}/{filename}"
            logger.info(f"File {filename} uploaded to GCS at {gcs_path}")
            return gcs_path
        except Exception as e:
            logger.error(f"GCS upload failed: {e}. Falling back to local file storage.")
    
    # Local fallback
    local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
    file_obj.seek(0)
    with open(local_path, "wb") as f:
        f.write(file_obj.read())
    logger.info(f"File {filename} saved locally to {local_path}")
    return local_path
