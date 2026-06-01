import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import connect_db, close_db
from .routes import datasets, payments, ai, auth, zkprover, profiles, sui_rpc
from .services.auth_config import get_frontend_origins

# Setup logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")
FRONTEND_ORIGINS = get_frontend_origins()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect database on startup
    app.state.google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    app.state.frontend_origins = FRONTEND_ORIGINS
    await connect_db()
    yield
    # Close database on shutdown
    await close_db()

app = FastAPI(
    title="Trainyard AI API",
    description="Backend API for Trainyard AI decentralized dataset marketplace",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(zkprover.router, prefix="/api/zkprover", tags=["zkprover"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["profiles"])
app.include_router(sui_rpc.router, prefix="/api/sui-rpc", tags=["sui-rpc"])

@app.get("/api")
async def root():
    return {
        "status": "healthy",
        "service": "Trainyard AI API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
