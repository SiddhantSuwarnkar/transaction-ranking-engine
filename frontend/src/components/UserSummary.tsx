import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import type { ApiResponse } from '../hooks/useApi';
import type { LogEntry } from './LiveLogs';

interface UserSummaryData {
  userId: string;
  totalVolume: number;
  netBalance: number;
  transactionCount: number;
}

interface UserSummaryProps {
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

export const UserSummary: React.FC<UserSummaryProps> = ({ onAddLog }) => {
  const [searchUserId, setSearchUserId] = useState('');
  const [userData, setUserData] = useState<UserSummaryData | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const { loading, request } = useApi();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUserId.trim()) return;

    setErrorText(null);
    const userId = searchUserId.trim();
    
    const response: ApiResponse<UserSummaryData> = await request<UserSummaryData>(
      `/summary/${userId}`,
      'GET'
    );

    if (response.error) {
      setUserData(null);
      setErrorText(response.error);
      onAddLog({
        method: 'GET',
        endpoint: `/summary/${userId}`,
        statusCode: response.statusCode || 404,
        latencyMs: response.latencyMs || 0,
        status: 'ERROR',
        payload: { error: response.error }
      });
    } else if (response.data) {
      setUserData(response.data);
      onAddLog({
        method: 'GET',
        endpoint: `/summary/${userId}`,
        statusCode: response.statusCode || 200,
        latencyMs: response.latencyMs || 0,
        status: 'PROCESSED',
        payload: response.data
      });
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-lg p-6 shadow-xl flex flex-col justify-between text-slate-800">
      <div>
        <h2 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Account Lookup Card
        </h2>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <input
            type="text"
            placeholder="Search User ID (e.g. user_1)"
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Lookup'}
          </button>
        </form>

        {/* Results Area */}
        {errorText && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-2 flex items-start gap-2.5 animate-fadeIn">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold">User Not Found</p>
              <p className="text-xs text-rose-600/80 mt-0.5">{errorText}</p>
            </div>
          </div>
        )}

        {userData ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center bg-emerald-50/20 p-3 rounded-lg border border-emerald-100/50">
              <span className="text-xs text-emerald-800/85 uppercase tracking-wider font-semibold">Active User</span>
              <span className="text-sm font-extrabold text-emerald-950 select-all">{userData.userId}</span>
            </div>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/40 flex flex-col">
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-bold">Net Balance</span>
                <span className={`text-sm font-extrabold mt-1 overflow-x-auto whitespace-nowrap scrollbar-none ${userData.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{userData.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/40 flex flex-col">
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-bold">Total Volume</span>
                <span className="text-sm font-extrabold mt-1 text-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
                  ₹{userData.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/40 flex flex-col">
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-bold">Tx Count</span>
                <span className="text-sm font-extrabold mt-1 text-emerald-700">
                  {userData.transactionCount}
                </span>
              </div>
            </div>
          </div>
        ) : (
          !errorText && (
            <div className="text-slate-400 text-center py-6 text-sm italic border border-dashed border-slate-200 rounded-lg bg-white/40">
              Search a user ID to check their aggregate balance metrics.
            </div>
          )
        )}
      </div>
    </div>
  );
};
