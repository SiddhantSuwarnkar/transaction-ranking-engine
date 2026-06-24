import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import type { ApiResponse } from '../hooks/useApi';
import type { LogEntry } from './LiveLogs';

export interface RankingItem {
  userId: string;
  score: number;
  totalAmount: number;
  transactionCount: number;
}

interface LeaderboardProps {
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  refreshTrigger: number; // Increment this to force reload rankings from other components
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onAddLog, refreshTrigger }) => {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [autoPoll, setAutoPoll] = useState(true);
  const { loading, request } = useApi();

  const fetchRankings = useCallback(async (isSilent = false) => {
    const response: ApiResponse<RankingItem[]> = await request<RankingItem[]>(
      '/ranking',
      'GET'
    );

    if (response.error) {
      if (!isSilent) {
        onAddLog({
          method: 'GET',
          endpoint: '/ranking',
          statusCode: response.statusCode || 500,
          latencyMs: response.latencyMs || 0,
          status: 'ERROR',
          payload: { error: response.error }
        });
      }
    } else if (response.data) {
      setRankings(response.data);
      if (!isSilent) {
        onAddLog({
          method: 'GET',
          endpoint: '/ranking',
          statusCode: response.statusCode || 200,
          latencyMs: response.latencyMs || 0,
          status: 'PROCESSED',
          payload: response.data
        });
      }
    }
  }, [request, onAddLog]);

  // Initial load or refresh trigger
  useEffect(() => {
    fetchRankings(false);
  }, [fetchRankings, refreshTrigger]);

  // Polling setup (every 3 seconds)
  useEffect(() => {
    if (!autoPoll) return;

    const interval = setInterval(() => {
      // Fetch silently in background to avoid spamming the log screen
      fetchRankings(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchRankings, autoPoll]);

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 shadow-2xl flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Multi-Factor Leaderboard
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            Auto-refresh (3s)
          </label>
          <button
            onClick={() => fetchRankings(false)}
            disabled={loading}
            className="p-1.5 rounded bg-slate-800 border border-slate-750 text-slate-300 hover:text-slate-100 hover:bg-slate-700 active:scale-95 transition-all"
            title="Refresh Leaderboard"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Exclude disclaimer */}
      <div className="text-[11px] text-slate-400/80 mb-4 bg-slate-950/30 p-2.5 rounded-xl border border-slate-850">
        <span className="font-bold text-amber-500">Note:</span> Abuse prevention active. Score calculates only transactions <span className="font-semibold text-slate-200">≥ ₹5.00</span>.
        <br />
        <span className="font-bold text-indigo-400">Score Formula:</span> (Qualifying Vol × 0.7) + (Qualifying Count × 0.3)
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 text-center">Rank</th>
              <th className="py-3 px-4">User ID</th>
              <th className="py-3 px-4 text-right">Qualifying Vol</th>
              <th className="py-3 px-4 text-center">Qualifying Count</th>
              <th className="py-3 px-4 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rankings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500 italic">
                  No active rankings. Post transactions to display rankings.
                </td>
              </tr>
            ) : (
              rankings.map((item, idx) => {
                const rank = idx + 1;
                let rankBadge = '';
                let rowBg = 'border-b border-slate-900/50 hover:bg-slate-900/10';
                
                if (rank === 1) {
                  rankBadge = 'bg-amber-400/10 text-amber-400 border-amber-500/25';
                  rowBg = 'bg-amber-500/5 border-b border-amber-900/20 hover:bg-amber-500/10';
                } else if (rank === 2) {
                  rankBadge = 'bg-slate-300/10 text-slate-300 border-slate-400/25';
                  rowBg = 'bg-slate-400/5 border-b border-slate-900/20 hover:bg-slate-400/10';
                } else if (rank === 3) {
                  rankBadge = 'bg-amber-700/15 text-amber-600 border-amber-700/25';
                  rowBg = 'bg-amber-700/5 border-b border-slate-900/20 hover:bg-amber-700/10';
                }

                return (
                  <tr key={item.userId} className={`transition-all ${rowBg}`}>
                    <td className="py-3.5 px-4 text-center">
                      {rank <= 3 ? (
                        <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${rankBadge}`}>
                          #{rank}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold text-xs">#{rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200 select-all">
                      {item.userId}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-300">
                      ₹{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-300">
                      {item.transactionCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-indigo-400">
                      {item.score.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
