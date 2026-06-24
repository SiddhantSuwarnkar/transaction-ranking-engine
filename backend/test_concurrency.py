import asyncio
import httpx
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000/api"


async def run_tests():
    print("=" * 60)
    print("STARTING INTEGRATION TESTS FOR HIGH-CONCURRENCY TRANSACTION ENGINE")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # Check if backend is reachable
        try:
            health = await client.get("http://127.0.0.1:8000/")
            print(f"Backend status: {health.json()['status']}")
        except Exception as e:
            print(f"ERROR: Cannot connect to backend at http://127.0.0.1:8000/ - {e}")
            print("Please make sure the FastAPI server is running.")
            sys.exit(1)

        # -------------------------------------------------------------
        # TEST 1: IDEMPOTENCY TEST (Duplicate request headers)
        # -------------------------------------------------------------
        print("\n--- Running Test 1: Idempotency Verification ---")
        
        # Reset database
        await client.post(f"{BASE_URL}/reset")
        
        userId = "idemp_user"
        amount = 100.0
        shared_key = f"key-{uuid.uuid4().hex}"
        
        # Prepare 10 concurrent requests with the SAME Idempotency-Key
        async def send_tx():
            return await client.post(
                f"{BASE_URL}/transaction",
                json={"userId": userId, "amount": amount},
                headers={"Idempotency-Key": shared_key}
            )

        print(f"Sending 10 concurrent requests with duplicate key: {shared_key}...")
        tasks = [send_tx() for _ in range(10)]
        responses = await asyncio.gather(*tasks)

        processed_count = 0
        cached_count = 0
        error_count = 0

        for r in responses:
            if r.status_code == 201:
                body = r.json()
                if body.get("status") == "PROCESSED":
                    processed_count += 1
                elif body.get("status") == "CACHED":
                    cached_count += 1
            else:
                error_count += 1

        print(f"Results: {processed_count} processed, {cached_count} served from cache, {error_count} errors.")
        
        # Verify exactly 1 was processed and 9 cached
        assert processed_count == 1, f"Expected 1 processed transaction, got {processed_count}"
        assert cached_count == 9, f"Expected 9 cached transactions, got {cached_count}"
        assert error_count == 0, f"Expected 0 errors, got {error_count}"

        # Fetch user summary to verify balance is updated only once
        summary_resp = await client.get(f"{BASE_URL}/summary/{userId}")
        assert summary_resp.status_code == 200, "User summary fetch failed"
        summary = summary_resp.json()
        
        assert summary["netBalance"] == 100.0, f"Expected netBalance of 100.0, got {summary['netBalance']}"
        assert summary["totalVolume"] == 100.0, f"Expected totalVolume of 100.0, got {summary['totalVolume']}"
        assert summary["transactionCount"] == 1, f"Expected transactionCount of 1, got {summary['transactionCount']}"
        
        print("[SUCCESS] Test 1: Idempotency successfully verified! Duplicate key returns cached response.")

        # -------------------------------------------------------------
        # TEST 2: RACE CONDITION LOCK SAFETY (Concurrent unique updates)
        # -------------------------------------------------------------
        print("\n--- Running Test 2: Concurrency Race Condition Safety ---")
        
        # Reset database
        await client.post(f"{BASE_URL}/reset")
        
        userId = "concur_user"
        amount = 10.0
        concurrency_limit = 50
        
        # Prepare 50 concurrent requests with UNIQUE Idempotency-Keys
        async def send_unique_tx(i):
            unique_key = f"key-concur-{i}-{uuid.uuid4().hex}"
            return await client.post(
                f"{BASE_URL}/transaction",
                json={"userId": userId, "amount": amount},
                headers={"Idempotency-Key": unique_key}
            )

        print(f"Sending {concurrency_limit} concurrent requests with unique keys for user '{userId}'...")
        tasks = [send_unique_tx(i) for i in range(concurrency_limit)]
        responses = await asyncio.gather(*tasks)

        success_count = 0
        for r in responses:
            if r.status_code == 201 and r.json().get("status") == "PROCESSED":
                success_count += 1
        
        print(f"Successfully processed: {success_count}/{concurrency_limit} transactions.")
        assert success_count == concurrency_limit, f"Expected {concurrency_limit} successful transactions, got {success_count}"

        # Fetch summary and assert exact balance (No lost updates!)
        summary_resp = await client.get(f"{BASE_URL}/summary/{userId}")
        assert summary_resp.status_code == 200, "User summary fetch failed"
        summary = summary_resp.json()
        
        expected_balance = amount * concurrency_limit
        assert summary["netBalance"] == expected_balance, f"Expected netBalance of {expected_balance}, got {summary['netBalance']}"
        assert summary["totalVolume"] == expected_balance, f"Expected totalVolume of {expected_balance}, got {summary['totalVolume']}"
        assert summary["transactionCount"] == concurrency_limit, f"Expected transactionCount of {concurrency_limit}, got {summary['transactionCount']}"
        
        print("[SUCCESS] Test 2: Concurrency safety verified! 50 concurrent updates completed with no lost data.")

        # -------------------------------------------------------------
        # TEST 3: MULTI-FACTOR RANKING & INR 5 ABUSE FILTER
        # -------------------------------------------------------------
        print("\n--- Running Test 3: Multi-Factor Ranking & INR 5 Filter ---")
        
        # Reset database
        await client.post(f"{BASE_URL}/reset")
        
        # Send transactions
        # User A: ₹10 (qualifies), ₹2 (filtered out). Qualifying vol: ₹10, count: 1. Score: 10 * 0.7 + 1 * 0.3 = 7.3
        await client.post(f"{BASE_URL}/transaction", json={"userId": "UserA", "amount": 10.0}, headers={"Idempotency-Key": "a1"})
        await client.post(f"{BASE_URL}/transaction", json={"userId": "UserA", "amount": 2.0}, headers={"Idempotency-Key": "a2"})
        
        # User B: ₹6 (qualifies), ₹6 (qualifies). Qualifying vol: ₹12, count: 2. Score: 12 * 0.7 + 2 * 0.3 = 9.0
        await client.post(f"{BASE_URL}/transaction", json={"userId": "UserB", "amount": 6.0}, headers={"Idempotency-Key": "b1"})
        await client.post(f"{BASE_URL}/transaction", json={"userId": "UserB", "amount": 6.0}, headers={"Idempotency-Key": "b2"})
        
        # User C: ₹4.99 (filtered out). Has 0 qualifying transactions. Should be excluded completely from ranking.
        await client.post(f"{BASE_URL}/transaction", json={"userId": "UserC", "amount": 4.99}, headers={"Idempotency-Key": "c1"})

        # Get Rankings
        ranking_resp = await client.get(f"{BASE_URL}/ranking")
        assert ranking_resp.status_code == 200, "Ranking fetch failed"
        rankings = ranking_resp.json()
        
        print("Retrieved Rankings:")
        for idx, item in enumerate(rankings):
            print(f" #{idx+1} {item['userId']} | Score: {item['score']} | Qualifying Vol: {item['totalAmount']} | Count: {item['transactionCount']}")

        # Assertions
        assert len(rankings) == 2, f"Expected exactly 2 users in rankings (UserC excluded), got {len(rankings)}"
        
        # User B should be #1
        assert rankings[0]["userId"] == "UserB", f"Expected rank 1 to be UserB, got {rankings[0]['userId']}"
        assert rankings[0]["score"] == 9.0, f"Expected UserB score of 9.0, got {rankings[0]['score']}"
        assert rankings[0]["totalAmount"] == 12.0, f"Expected UserB qualifying amount of 12.0, got {rankings[0]['totalAmount']}"
        assert rankings[0]["transactionCount"] == 2, f"Expected UserB qualifying count of 2, got {rankings[0]['transactionCount']}"

        # User A should be #2
        assert rankings[1]["userId"] == "UserA", f"Expected rank 2 to be UserA, got {rankings[1]['userId']}"
        assert rankings[1]["score"] == 7.3, f"Expected UserA score of 7.3, got {rankings[1]['score']}"
        assert rankings[1]["totalAmount"] == 10.0, f"Expected UserA qualifying amount of 10.0, got {rankings[1]['totalAmount']}"
        assert rankings[1]["transactionCount"] == 1, f"Expected UserA qualifying count of 1, got {rankings[1]['transactionCount']}"
        
        print("[SUCCESS] Test 3: Ranking formulas and INR 5 filter verified! Abuse prevention behaves correctly.")
        
    print("\n" + "=" * 60)
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_tests())
