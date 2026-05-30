import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import connect_db, close_db
from .routes import datasets, payments, ai

# Setup logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect database on startup
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "Trainyard AI API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
