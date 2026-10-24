from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.import_csv import ImportSummaryResponse
from app.services.import_service import MAX_FILE_SIZE_BYTES, import_complaints_csv

router = APIRouter(prefix="/import", tags=["Import"])


@router.post(
    "/csv",
    response_model=ImportSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Import complaints from CSV",
    description="Safely imports and validates complaint records from a CSV file. Enforces a 2 MB size limit and 500-row limit.",
)
async def upload_complaints_csv(
    file: UploadFile = File(..., description="CSV file with complaint rows."),
    db: Session = Depends(get_db),
) -> ImportSummaryResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .csv extension.",
        )

    content_chunks = []
    total_bytes = 0
    chunk_size = 64 * 1024

    try:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
                )
            content_chunks.append(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {exc}",
        ) from exc

    content = b"".join(content_chunks)

    try:
        summary = import_complaints_csv(db=db, file_content=content)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        ) from ve

    return summary
