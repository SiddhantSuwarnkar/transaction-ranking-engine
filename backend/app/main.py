import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import API_PREFIX
from app.routers.api import router as api_router

app = FastAPI(
    title="Enterprise Transaction & Ranking System",
    description="High-concurrency, safe transaction backend with idempotency key caching and multi-factor ranking.",
    version="1.0.0",
)

# Configure CORS to allow frontend communication
# We allow all origins for easy local running and testing.
# Credentials are not needed since we rely on custom headers (Idempotency-Key) and JSON payload.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Mount endpoints under the configured prefix (e.g. /api)
app.include_router(api_router, prefix=API_PREFIX)


@app.get("/", tags=["Health Check"])
def index():
    return {
        "status": "online",
        "message": "Enterprise Transaction & Ranking System Backend is running.",
        "docs_url": "/docs"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
