from pydantic import BaseModel, Field


class TransactionRequest(BaseModel):
    userId: str = Field(..., min_length=1, description="Unique identifier for the user")
    amount: float = Field(..., description="Transaction amount (can be positive for deposit, negative for withdrawal)")


class TransactionResponse(BaseModel):
    transactionId: str = Field(..., description="Unique generated transaction ID")
    userId: str = Field(..., description="Unique user identifier")
    amount: float = Field(..., description="Transaction amount")
    timestamp: str = Field(..., description="High-precision ISO timestamp of processing")
    status: str = Field(..., description="Status of the operation: PROCESSED or CACHED")


class UserSummaryResponse(BaseModel):
    userId: str = Field(..., description="Unique user identifier")
    totalVolume: float = Field(..., description="Aggregate total of all absolute transaction amounts")
    netBalance: float = Field(..., description="Net sum of all transaction amounts")
    transactionCount: int = Field(..., description="Total number of transactions completed by user")


class RankingItem(BaseModel):
    userId: str = Field(..., description="Unique user identifier")
    score: float = Field(..., description="Multi-factor score: (Total Qualifying Amount * 0.7) + (Qualifying Count * 0.3)")
    totalAmount: float = Field(..., description="Total volume of qualifying transactions (amount >= ₹5)")
    transactionCount: int = Field(..., description="Total count of qualifying transactions (amount >= ₹5)")
