"""Chatbot API router — Module 1."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from config import settings
from services.llm_service import get_chat_response
from services.database_service import save_chat_interaction

router = APIRouter()


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=5000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User's question about Nipah virus")
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    response: str
    disclaimer: str = (
        "This information is for educational purposes only. "
        "Please consult healthcare professionals for medical advice."
    )


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the Nipah virus chatbot and receive an AI-generated response."""
    history = [{"role": m.role, "content": m.content} for m in request.history]
    response_text = await get_chat_response(request.message, history)

    try:
        save_chat_interaction(
            db_path=settings.SQLITE_DB_PATH,
            user_message=request.message,
            assistant_response=response_text,
            used_llm=bool(settings.OPENAI_API_KEY),
            llm_model=settings.LLM_MODEL if settings.OPENAI_API_KEY else None,
        )
    except Exception:
        # Persistence should not block chat responses.
        pass

    return ChatResponse(response=response_text)
