from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, themes, videos
from app.core.database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MISAVY API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(themes.router)
app.include_router(videos.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to MISAVY API"}
