from fastapi import APIRouter
from .datasets_read import router as read_router
from .datasets_write import router as write_router

router = APIRouter()

# Include split sub-routers to keep source files modular and under 150 lines
router.include_router(read_router)
router.include_router(write_router)
