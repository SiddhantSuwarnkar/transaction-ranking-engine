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
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 00.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Multi-Factor Leaderboard
        </h2>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
              className="rounded border-slate-350 text-emerald-600 focus:ring-emerald-500"
            />
            Auto-polling (3s)
          </label>
          
          {/* Refined, visible Refresh Rankings Button */}
          <button
            onClick={() => fetchRankings(false)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 disabled:bg-slate-50 border border-emerald-250/50 hover:border-emerald-300 disabled:border-slate-200 text-emerald-800 text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            title="Refresh Leaderboard"
          >
            <svg className={`w-3.5 h-3.5 text-emerald-700 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
            </svg>
            Refresh Rankings
          </button>
        </div>
      </div>

      {/* Exclude disclaimer */}
      <div className="text-[11px] text-slate-500 mb-4 bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/40">
        <span className="font-bold text-emerald-700">Anti-Abuse Rule:</span> Only transactions <span className="font-bold text-slate-700">≥ ₹5.00</span> are counted in the leaderboard.
        <br />
        <span className="font-bold text-slate-500">Weight Formula:</span> (Qualifying Amount × 70%) + (Qualifying Count × 30%)
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-emerald-100 text-xs text-emerald-800 font-bold uppercase tracking-wider">
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
                <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                  No active rankings. Post transactions to display rankings.
                </td>
              </tr>
            ) : (
              rankings.map((item, idx) => {
                const rank = idx + 1;
                let rankBadge = '';
                let rowBg = 'border-b border-slate-100 hover:bg-slate-50/50';
                
                if (rank === 1) {
                  rankBadge = 'bg-emerald-600 text-white border-emerald-700 shadow-sm';
                  rowBg = 'bg-emerald-50/15 border-b border-emerald-100/80 hover:bg-emerald-50/30';
                } else if (rank === 2) {
                  rankBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300/40';
                  rowBg = 'bg-emerald-50/5 border-b border-emerald-100/50 hover:bg-emerald-50/15';
                } else if (rank === 3) {
                  rankBadge = 'bg-teal-50 text-teal-800 border-teal-200/40';
                  rowBg = 'bg-teal-50/5 border-b border-emerald-100/50 hover:bg-teal-50/10';
                }

                return (
                  <tr key={item.userId} className={`transition-all ${rowBg} even:bg-slate-50/30`}>
                    <td className="py-3.5 px-4 text-center">
                      {rank <= 3 ? (
                        <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${rankBadge}`}>
                          #{rank}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold text-xs">#{rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 select-all">
                      {item.userId}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                      ₹{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                      {item.transactionCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
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
