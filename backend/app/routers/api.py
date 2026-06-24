from fastapi import APIRouter, Header, HTTPException, Response, status
from typing import List, Optional

from app.models.schemas import TransactionRequest, TransactionResponse, UserSummaryResponse, RankingItem
from app.services import transaction_service
from app import database

router = APIRouter()


@router.post("/transaction", response_model=TransactionResponse)
async def create_transaction(
    request: TransactionRequest,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Handles transaction creation. Validates that the Idempotency-Key header is present.
    If the key has been processed, returns the cached response.
    Under the hood, uses asyncio.Lock to prevent concurrent race conditions.
    """
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'Idempotency-Key' is required for transaction requests"
        )
    
    # Process the transaction through service layer (with locks and double-check logic)
    result = await transaction_service.process_transaction(idempotency_key, request)
    
    # Set the appropriate status code in the response
    response.status_code = result["status_code"]
    return result["content"]


@router.get("/summary/{userId}", response_model=UserSummaryResponse)
def get_user_summary(userId: str):
    """
    Returns aggregate volume, net balance, and transaction count for a user.
    Raises 404 if the user does not exist.
    """
    summary = transaction_service.get_user_summary(userId)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{userId}' does not exist"
        )
    return summary


@router.get("/ranking", response_model=List[RankingItem])
def get_leaderboard():
    """
    Returns the user leaderboard calculated using a multi-factor score:
    Score = (Qualifying Total Amount * 0.7) + (Qualifying Transaction Count * 0.3)
    Excludes transaction amounts under ₹5.
    """
    return transaction_service.get_rankings()


@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_database():
    """
    Clears all database storage.
    """
    database.reset_db()
    return {"status": "success", "message": "In-memory database cleared successfully"}
