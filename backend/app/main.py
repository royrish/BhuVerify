from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router
from app.config import FRONTEND_ORIGINS

app = FastAPI(title="BhuVerify AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "BhuVerify AI API",
    }


@app.get("/")
def root():
    return {"message": "BhuVerify AI API is running"}
