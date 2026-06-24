# In-memory storage engines representing the database layer.

# Data structures:
# transactions: dict of transaction_id (str) -> dict
#   example: { "tx-123": { "transactionId": "tx-123", "userId": "user1", "amount": 100.0, "timestamp": "..." } }
transactions = {}

# idempotency_keys: set of processed idempotency keys
idempotency_keys = set()

# idempotency_responses: dict of idempotency_key (str) -> dict (response cache)
#   stores: { "status_code": int, "content": dict }
idempotency_responses = {}

# user_balances: dict of userId (str) -> dict
#   example: { "user1": { "userId": "user1", "net_balance": 100.0, "total_volume": 100.0, "transaction_count": 1 } }
user_balances = {}


def reset_db():
    """Utility to clear the database. Very helpful for integration testing."""
    transactions.clear()
    idempotency_keys.clear()
    idempotency_responses.clear()
    user_balances.clear()
