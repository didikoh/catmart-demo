from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routers import recommend, reports

app = FastAPI(
    title="CatMart ML API",
    description="Machine Learning API for product recommendations and analytics",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving generated reports
os.makedirs("/tmp/reports", exist_ok=True)
app.mount("/static", StaticFiles(directory="/tmp"), name="static")

# Include routers
app.include_router(recommend.router, prefix="/ml", tags=["recommendations"])
app.include_router(reports.router, prefix="/ml", tags=["reports"])

@app.get("/")
async def root():
    return {"message": "CatMart ML API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ml-api"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8090))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
