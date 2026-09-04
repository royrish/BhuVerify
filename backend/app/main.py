from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router
from app.api.gis import router as gis_router

app = FastAPI(
    title="BhuVerify API",
    description="Land Record Digitization and Cadastral Verification Engine",
    version="1.0.0",
)

# Allow requests from Next.js (port 3000) and any local development ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(documents_router)
app.include_router(gis_router)


# Health Check Endpoints (both /api/health and /health supported)
@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "BhuVerify API",
        "endpoints": {
            "documents": "/api/documents",
            "gis": "/api/documents/{document_id}/gis",
        },
    }