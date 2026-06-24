import React from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST';
  endpoint: string;
  idempotencyKey?: string;
  statusCode: number;
  latencyMs: number;
  status: 'PROCESSED' | 'CACHED' | 'ERROR' | 'RESET';
  payload: any;
}

interface LiveLogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LiveLogs: React.FC<LiveLogsProps> = ({ logs, onClear }) => {
  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-[400px] shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 pulse-dot" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-indigo-400">
            System Live Logs & Telemetry
          </h2>
        </div>
        <button
          onClick={onClear}
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700"
        >
          Clear Terminal
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2.5 pr-2 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic flex items-center justify-center h-full">
            No system requests fired yet. Submit a transaction or search a user.
          </div>
        ) : (
          logs.map((log) => {
            const isError = log.status === 'ERROR';
            const isCached = log.status === 'CACHED';
            const isReset = log.status === 'RESET';
            
            let statusBadgeColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50';
            if (isError) {
              statusBadgeColor = 'text-rose-400 bg-rose-950/40 border-rose-900/50';
            } else if (isCached) {
              statusBadgeColor = 'text-amber-400 bg-amber-950/40 border-amber-900/50';
            } else if (isReset) {
              statusBadgeColor = 'text-sky-400 bg-sky-950/40 border-sky-900/50';
            }

            return (
              <div
                key={log.id}
                className={`p-2.5 rounded border transition-all ${
                  isError
                    ? 'bg-rose-950/10 border-rose-900/25'
                    : isCached
                    ? 'bg-amber-950/10 border-amber-900/25'
                    : isReset
                    ? 'bg-sky-950/10 border-sky-900/25'
                    : 'bg-indigo-950/10 border-indigo-900/25'
                }`}
              >
                {/* Meta details */}
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{log.timestamp}</span>
                    <span className="font-bold text-slate-300">
                      {log.method} {log.endpoint}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Latency:</span>
                    <span className={log.latencyMs > 100 ? 'text-amber-400' : 'text-slate-300'}>
                      {log.latencyMs}ms
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-500">HTTP Status:</span>
                    <span className={`font-bold ${isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {log.statusCode}
                    </span>
                  </div>
                </div>

                {/* Idempotency Key header log */}
                {log.idempotencyKey && (
                  <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                    <span className="font-semibold text-slate-400">Idempotency-Key:</span>
                    <span className="bg-slate-900 px-1 py-0.5 rounded select-all font-semibold text-violet-400">
                      {log.idempotencyKey}
                    </span>
                  </div>
                )}

                {/* Status tag & payload */}
                <div className="flex items-start gap-2 mt-1">
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-semibold ${statusBadgeColor}`}>
                    {log.status === 'PROCESSED' && '[PROCESSED NEW]'}
                    {log.status === 'CACHED' && '[SERVED FROM CACHED IDEMPOTENCY]'}
                    {log.status === 'ERROR' && '[FAILED/ERROR]'}
                    {log.status === 'RESET' && '[SYSTEM DB RESET]'}
                  </span>
                  <div className="flex-1 overflow-x-auto text-[11px] text-slate-300 whitespace-pre-wrap max-w-full">
                    {typeof log.payload === 'object'
                      ? JSON.stringify(log.payload)
                      : log.payload}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
