import { useState, startTransition } from 'react';
import { TransactionForm } from './components/TransactionForm';
import { UserSummary } from './components/UserSummary';
import { Leaderboard } from './components/Leaderboard';
import { LiveLogs } from './components/LiveLogs';
import type { LogEntry } from './components/LiveLogs';
import { useApi } from './hooks/useApi';

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [leaderboardTrigger, setLeaderboardTrigger] = useState(0);
  const { request } = useApi();

  const addLog = (logDetail: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...logDetail,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0')
    };
    setLogs((prevLogs) => [newLog, ...prevLogs]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const triggerLeaderboardRefresh = () => {
    setLeaderboardTrigger((prev) => prev + 1);
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all transactions and user balance data?')) return;

    const response = await request<{ status: string; message: string }>('/reset', 'POST');
    
    if (response.error) {
      addLog({
        method: 'POST',
        endpoint: '/reset',
        statusCode: response.statusCode || 500,
        latencyMs: response.latencyMs || 0,
        status: 'ERROR',
        payload: { error: response.error }
      });
    } else {
      addLog({
        method: 'POST',
        endpoint: '/reset',
        statusCode: response.statusCode || 200,
        latencyMs: response.latencyMs || 0,
        status: 'RESET',
        payload: response.data || 'In-memory database reset successful.'
      });
      startTransition(() => {
        triggerLeaderboardRefresh();
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#041a15] text-slate-100 flex flex-col font-sans relative overflow-hidden pb-12">
      {/* Background Decorative Glow Spots - Natural Emerald & Mint */}
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] bg-emerald-700/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-green-700/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-950/60 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-tr from-emerald-600 to-green-600 shadow-md shadow-emerald-600/10">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Enterprise Concurrency Suite
            </h1>
            <p className="text-xs text-emerald-450 font-bold uppercase tracking-wider mt-0.5">
              High-Concurrency Transaction & Ranking Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-300 font-bold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
            FastAPI Service Online
          </div>
          
          {/* Reset Database Button */}
          <button
            onClick={handleResetDatabase}
            className="px-4 py-1.5 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 hover:text-rose-250 border border-rose-900/40 hover:border-rose-800/60 text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Reset Ledger Data
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="w-full max-w-7xl mx-auto px-6 mt-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10">
        
        {/* Full Width Lookup Card (12 cols) */}
        <section className="lg:col-span-12">
          <UserSummary onAddLog={addLog} />
        </section>

        {/* Left Column - Submission Form (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <TransactionForm 
            onAddLog={addLog} 
            onRefreshLeaderboard={triggerLeaderboardRefresh} 
          />
        </section>

        {/* Right Column - Leaderboard Rankings (7 cols) */}
        <section className="lg:col-span-7 h-full">
          <Leaderboard 
            onAddLog={addLog} 
            refreshTrigger={leaderboardTrigger} 
          />
        </section>

        {/* Bottom Full-Width Column - Terminal Telemetry (12 cols) */}
        <section className="lg:col-span-12">
          <LiveLogs 
            logs={logs} 
            onClear={clearLogs} 
          />
        </section>

      </main>
    </div>
  );
}

export default App;
