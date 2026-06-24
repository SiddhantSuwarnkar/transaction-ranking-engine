# Enterprise High-Concurrency Transaction & Ranking System

A robust, decoupled development showcase demonstrating concurrent state protection, transaction idempotency caching, and multi-factor rank calculation. Built with a modular **FastAPI** backend and a premium glassmorphic **React (Vite + TypeScript + Tailwind CSS)** frontend.

---

## Directory Structure

```plaintext
high-concurrency-system/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # Application entry point & CORS configuration
│   │   ├── config.py               # Global constants and app configurations
│   │   ├── database.py             # In-memory storage engines
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── transaction_service.py # Core business logic, locks, and ranking engine
│   │   └── routers/
│   │       ├── __init__.py
│   │       └── api.py              # API route definitions (POST, GET endpoints)
│   ├── requirements.txt            # Dependencies (fastapi, uvicorn, pydantic, httpx)
│   └── test_concurrency.py         # Automated integration testing script
│
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── TransactionForm.tsx # Submission panel & Concurrency simulation
    │   │   ├── UserSummary.tsx     # Account details lookup card
    │   │   ├── Leaderboard.tsx     # Dynamic multi-factor ranking table
    │   │   └── LiveLogs.tsx        # Streamed terminal-style response logger
    │   ├── hooks/
    │   │   └── useApi.ts           # Custom fetch wrapper for API abstraction
    │   ├── App.tsx                 # Main layout structure & state coordination
    │   ├── index.css               # Tailwind directives
    │   └── main.tsx                # React DOM initialization
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## Architecture & Concurrency Design

### 1. Safe Concurrency (Locking)
FastAPI processes requests asynchronously. In-memory dictionary updates are prone to race conditions (e.g. read-modify-write conflicts) under high concurrent load. To ensure data consistency, the backend implements a global **`asyncio.Lock()`** in the service layer (`app/services/transaction_service.py`). Modifications to the database structures (`user_balances` and `transactions`) are fully serialized, eliminating lost updates.

### 2. Idempotency (Double-Check Lock Pattern)
Every transaction submission requires an `Idempotency-Key` header. To prevent dual-charging or duplicate writes, we check for request duplicates before and after acquiring the lock:
1. **First Check (Lock-Free)**: Check if the key is already in the `idempotency_keys` set. If it exists, retrieve the cached response from `idempotency_responses` and return it immediately.
2. **Lock Acquisition**: Acquire the global `asyncio.Lock()`.
3. **Second Check (Double-Check)**: Re-verify if the key entered the set while waiting for the lock. If it did, return the cached response.
4. **Execution**: If the key is new, process the transaction, calculate balance changes, save to transaction history, store the response payload in cache, and insert the key into the set.

This pattern minimizes lock contention (since cached duplicate requests skip locking entirely) while guaranteeing absolute write safety.

### 3. Multi-Factor Ranking & Abuse Filter
The ranking engine aggregates user transactions and computes scores using:
$$\text{Score} = (\text{Total Qualifying Amount} \times 0.7) + (\text{Qualifying Transaction Count} \times 0.3)$$

- **Abuse Prevention Filter**: To prevent rank manipulation (e.g., users sending hundreds of ₹0.01 micro-transactions to boost count), the ranking query filters out all transactions where the amount is **less than ₹5.00**. Only transactions $\ge$ ₹5.00 qualify for ranking.
- User rankings are sorted in descending order of score.

---

## Getting Started

### 1. Spin Up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up a Python virtual environment and activate it:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   
   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Uvicorn server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   The backend will start at `http://127.0.0.1:8000/`. You can view the OpenAPI interactive docs at `http://127.0.0.1:8000/docs`.

---

### 2. Spin Up the Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173/` to view the dashboard.

---

## Testing

### Automated Concurrency Testing
We provide a Python script that tests the system by sending rapid asynchronous network requests to simulate heavy loads.

With the backend server running, execute:
```bash
# In the backend directory
python test_concurrency.py
```
**Test Cases Covered**:
1. **Idempotency Check**: Fires 10 concurrent requests with the *same* `Idempotency-Key` header. Asserts that exactly 1 writes to the database, 9 receive cached responses, and the user's balance increments only once.
2. **Race Condition Check**: Fires 50 concurrent requests with *different* keys for a single user. Asserts that all 50 write safely (atomic updates) and the final balance matches the sum of amounts perfectly (no lost updates).
3. **Ranking Filter**: Fires transactions of varying amounts (above and below the ₹5.00 limit) and asserts that the leaderboard correctly filters out transactions below ₹5.00 and orders scores descending.

### Manual Concurrency Testing in the Browser
The React UI features a **Concurrency Simulation Suite** in the transaction form:
1. Input a **User ID** (e.g. `alex`) and an **Amount** (e.g. `50`).
2. Toggle the checkbox: **"Use shared/duplicate Idempotency Key"**.
3. Click **"Simulate 10 Rapid Requests"**.
   - Observe the **Live Logs** terminal. You will see 1 request marked as `[PROCESSED NEW]` (HTTP 201) and 9 requests marked as `[SERVED FROM CACHED IDEMPOTENCY]` (HTTP 201 cached). 
   - Lookup the user summary; the balance will have increased by only ₹50.
4. Uncheck **"Use shared/duplicate Idempotency Key"**.
5. Click **"Simulate 10 Rapid Requests"** again.
   - You will see 10 requests marked as `[PROCESSED NEW]` (HTTP 201) with distinct transaction IDs in the terminal.
   - Lookup the user summary; the balance will have increased by ₹500, verifying atomic locking consistency under stress.
