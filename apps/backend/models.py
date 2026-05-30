from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class DatasetListing(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    description: str
    category: str  # "nlp" | "vision" | "audio" | "tabular" | "multimodal" | "other"
    price_sui: float
    blob_id: str
    preview_blob_id: str
    iv: str  # base64 representation of IV
    seller_address: str
    file_name: str
    file_size_bytes: int
    file_type: str  # csv, json, zip, txt, parquet
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    download_count: int = 0
    walrus_explorer_url: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        json_schema_extra = {
            "example": {
                "title": "MNIST Labeled Digits",
                "description": "70,000 28x28 grayscale images of handwritten digits, optimized for training classification models.",
                "category": "vision",
                "price_sui": 0.5,
                "blob_id": "mock-mnist-blob-id",
                "preview_blob_id": "mock-mnist-preview-id",
                "iv": "dGVzdC1pdi1iYXNlNjQ=",
                "seller_address": "0x1234...5678",
                "file_name": "mnist.zip",
                "file_size_bytes": 11500000,
                "file_type": "zip",
                "tags": ["mnist", "handwritten", "classification", "vision"],
                "created_at": "2026-05-30T09:00:00Z",
                "download_count": 0,
                "walrus_explorer_url": "https://walruscan.com/mainnet/blob/mock-mnist-blob-id"
            }
        }
