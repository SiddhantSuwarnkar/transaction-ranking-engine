import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import type { LogEntry } from './LiveLogs';

interface TransactionFormProps {
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  onRefreshLeaderboard: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onAddLog,
  onRefreshLeaderboard,
}) => {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [useSameKeyForSim, setUseSameKeyForSim] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const { loading, request } = useApi();

  // Helper to generate UUIDv4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Generate an idempotency key on mount
  useEffect(() => {
    regenerateKey();
  }, []);

  const regenerateKey = () => {
    setIdempotencyKey(generateUUID());
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !amount.trim()) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return;

    const reqBody = { userId: userId.trim(), amount: parsedAmount };
    const keyToUse = idempotencyKey.trim() || generateUUID();

    const response = await request<any>(
      '/transaction',
      'POST',
      reqBody,
      { 'Idempotency-Key': keyToUse }
    );

    if (response.error) {
      onAddLog({
        method: 'POST',
        endpoint: '/transaction',
        idempotencyKey: keyToUse,
        statusCode: response.statusCode || 400,
        latencyMs: response.latencyMs || 0,
        status: 'ERROR',
        payload: { error: response.error },
      });
    } else if (response.data) {
      onAddLog({
        method: 'POST',
        endpoint: '/transaction',
        idempotencyKey: keyToUse,
        statusCode: response.statusCode || 201,
        latencyMs: response.latencyMs || 0,
        status: response.data.status === 'CACHED' ? 'CACHED' : 'PROCESSED',
        payload: response.data,
      });
      onRefreshLeaderboard();
    }
  };

  // Simulates 10 concurrent requests to test idempotency or race condition safety
  const handleSimulateConcurrency = async () => {
    if (!userId.trim() || !amount.trim()) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return;

    setSimulating(true);
    onAddLog({
      method: 'POST',
      endpoint: '/transaction (SIMULATION START)',
      statusCode: 0,
      latencyMs: 0,
      status: 'RESET',
      payload: `Dispatched 10 concurrent requests. Mode: ${
        useSameKeyForSim ? 'DUPLICATE IDEMPOTENCY KEY' : 'UNIQUE IDEMPOTENCY KEYS'
      }`,
    });

    const requests = [];
    const sharedKey = idempotencyKey.trim() || generateUUID();

    for (let i = 0; i < 10; i++) {
      const keyToUse = useSameKeyForSim ? sharedKey : generateUUID();
      const reqBody = { userId: userId.trim(), amount: parsedAmount };

      // Dispatch request in parallel
      requests.push(
        request<any>(
          '/transaction',
          'POST',
          reqBody,
          { 'Idempotency-Key': keyToUse }
        ).then((response) => ({
          response,
          keyToUse,
        }))
      );
    }

    try {
      // Execute all 10 simultaneously
      const results = await Promise.all(requests);

      // Log all results to the telemetry screen
      results.forEach(({ response, keyToUse }) => {
        if (response.error) {
          onAddLog({
            method: 'POST',
            endpoint: '/transaction',
            idempotencyKey: keyToUse,
            statusCode: response.statusCode || 400,
            latencyMs: response.latencyMs || 0,
            status: 'ERROR',
            payload: { error: response.error },
          });
        } else if (response.data) {
          onAddLog({
            method: 'POST',
            endpoint: '/transaction',
            idempotencyKey: keyToUse,
            statusCode: response.statusCode || 201,
            latencyMs: response.latencyMs || 0,
            status: response.data.status === 'CACHED' ? 'CACHED' : 'PROCESSED',
            payload: response.data,
          });
        }
      });

      onRefreshLeaderboard();
      // Regenerate key to prepare for next test
      regenerateKey();
    } catch (err: any) {
      onAddLog({
        method: 'POST',
        endpoint: '/transaction',
        statusCode: 500,
        latencyMs: 0,
        status: 'ERROR',
        payload: `Simulation failed: ${err.message}`,
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 shadow-2xl">
      <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Transaction Submission
      </h2>

      <form onSubmit={handleSingleSubmit} className="space-y-4">
        {/* User ID Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            User ID
          </label>
          <input
            type="text"
            required
            placeholder="Enter User ID (e.g. user_1)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-200 placeholder-slate-500 text-sm"
          />
        </div>

        {/* Amount Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Amount (₹)
          </label>
          <input
            type="number"
            required
            step="any"
            placeholder="Enter amount (negative for withdrawals)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-200 placeholder-slate-500 text-sm"
          />
        </div>

        {/* Idempotency Key Field */}
        <div>
          <label className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            <span>Idempotency-Key Header</span>
            <button
              type="button"
              onClick={regenerateKey}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold normal-case hover:underline"
            >
              Regenerate
            </button>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Idempotency-Key"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-300 placeholder-slate-500 text-xs font-mono select-all"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="submit"
            disabled={loading || simulating}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all active:scale-98 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading && !simulating ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Send Single Transaction'
            )}
          </button>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Concurrency Simulation Suite
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Concurrency parameters */}
          <div className="bg-slate-950/20 p-3.5 rounded-xl border border-slate-850 space-y-2.5">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={useSameKeyForSim}
                onChange={(e) => setUseSameKeyForSim(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              Use shared/duplicate Idempotency Key
            </label>
            <p className="text-[10px] text-slate-500 leading-normal">
              {useSameKeyForSim
                ? 'Only 1 transaction will write to database, 9 returns cached payload.'
                : '10 distinct transactions will write concurrently, showing atomic lock consistency.'}
            </p>

            <button
              type="button"
              onClick={handleSimulateConcurrency}
              disabled={loading || simulating || !userId.trim() || !amount.trim()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 disabled:bg-slate-900 disabled:text-slate-650 border border-slate-700/50 hover:border-slate-600 disabled:border-slate-850 text-slate-200 text-xs font-bold rounded-lg transition-all active:scale-98 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {simulating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Simulating 10 Calls...
                </>
              ) : (
                'Simulate 10 Rapid Requests'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
