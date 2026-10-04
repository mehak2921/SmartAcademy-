from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from core.security import get_current_user
from api import chat, documents, analytics, quiz, flashcards
import uvicorn

app = FastAPI(title="Smart Academy API")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(flashcards.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Academy API"}

@app.get("/api/auth/me")
def get_me(user = Depends(get_current_user)):
    """Returns the currently authenticated user"""
    return {"user": user.model_dump()}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
