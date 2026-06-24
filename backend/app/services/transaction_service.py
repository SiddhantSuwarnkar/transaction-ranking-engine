import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional

from app import database, config
from app.models.schemas import TransactionRequest, TransactionResponse, UserSummaryResponse, RankingItem


# Global lock instance to serialize transaction processing and avoid race conditions
transaction_lock = asyncio.Lock()


async def process_transaction(idempotency_key: str, req: TransactionRequest) -> Dict[str, Any]:
    """
    Processes a transaction with idempotency and thread-safety using the Double-Check Lock pattern.
    
    Returns a dictionary structured as:
    {
        "status_code": int,
        "content": Dict[str, Any]
    }
    """
    # 1. First Check (Lock-Free)
    if idempotency_key in database.idempotency_keys:
        cached = database.idempotency_responses.get(idempotency_key)
        if cached:
            # Create a copy so we don't modify the database cache record itself
            response_copy = dict(cached)
            response_copy["content"] = dict(cached["content"])
            response_copy["content"]["status"] = "CACHED"
            return response_copy

    # 2. Acquire Lock
    async with transaction_lock:
        # 3. Second Check (Under Lock - Guard against race conditions)
        if idempotency_key in database.idempotency_keys:
            cached = database.idempotency_responses.get(idempotency_key)
            if cached:
                response_copy = dict(cached)
                response_copy["content"] = dict(cached["content"])
                response_copy["content"]["status"] = "CACHED"
                return response_copy

        # 4. Core Transaction logic
        userId = req.userId
        amount = req.amount
        
        # Create a unique transaction ID and high-precision ISO timestamp
        transactionId = f"tx_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Update User Balance aggregates
        if userId not in database.user_balances:
            database.user_balances[userId] = {
                "userId": userId,
                "net_balance": 0.0,
                "total_volume": 0.0,
                "transaction_count": 0
            }
        
        balance_ref = database.user_balances[userId]
        balance_ref["net_balance"] += amount
        balance_ref["total_volume"] += abs(amount)
        balance_ref["transaction_count"] += 1

        # Store individual transaction record
        tx_record = {
            "transactionId": transactionId,
            "userId": userId,
            "amount": amount,
            "timestamp": timestamp
        }
        database.transactions[transactionId] = tx_record

        # Construct final response payload
        success_response = {
            "status_code": 201,
            "content": {
                "transactionId": transactionId,
                "userId": userId,
                "amount": amount,
                "timestamp": timestamp,
                "status": "PROCESSED"
            }
        }

        # Save to idempotency cache & track key
        database.idempotency_responses[idempotency_key] = success_response
        database.idempotency_keys.add(idempotency_key)

        return success_response


def get_user_summary(userId: str) -> Optional[UserSummaryResponse]:
    """Retrieves the aggregate statistics of a user, returning None if user does not exist."""
    balance = database.user_balances.get(userId)
    if not balance:
        return None
    
    return UserSummaryResponse(
        userId=userId,
        totalVolume=balance["total_volume"],
        netBalance=balance["net_balance"],
        transactionCount=balance["transaction_count"]
    )


def get_rankings() -> List[RankingItem]:
    """
    Computes user ranking based on:
    Score = (Total Amount of qualifying transactions * 0.7) + (Qualifying Count * 0.3)
    Only transactions with amount >= 5.0 (defined by config.RANKING_MIN_AMOUNT) qualify.
    """
    # 1. Group qualifying transactions by user
    user_qualifying_totals: Dict[str, Dict[str, Any]] = {}
    
    for tx in database.transactions.values():
        amount = tx["amount"]
        userId = tx["userId"]
        
        # Only count transactions >= minimum threshold (e.g. ₹5.00)
        if amount >= config.RANKING_MIN_AMOUNT:
            if userId not in user_qualifying_totals:
                user_qualifying_totals[userId] = {
                    "total_amount": 0.0,
                    "count": 0
                }
            user_qualifying_totals[userId]["total_amount"] += amount
            user_qualifying_totals[userId]["count"] += 1

    # 2. Calculate scores
    rankings_list: List[RankingItem] = []
    for userId, data in user_qualifying_totals.items():
        total_amount = data["total_amount"]
        count = data["count"]
        
        score = (total_amount * config.RANKING_VOLUME_WEIGHT) + (count * config.RANKING_COUNT_WEIGHT)
        
        rankings_list.append(RankingItem(
            userId=userId,
            score=round(score, 4),
            totalAmount=total_amount,
            transactionCount=count
        ))

    # 3. Sort descending by score. In case of ties, sort by userId alphabetically
    rankings_list.sort(key=lambda x: (-x.score, x.userId))
    return rankings_list
