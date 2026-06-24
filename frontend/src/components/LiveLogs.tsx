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
    <div className="bg-[#021d18] rounded-lg p-5 flex flex-col h-[400px] shadow-2xl relative border border-emerald-950/80 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-emerald-900/60">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400">
            System Live Logs & Telemetry Console
          </h2>
        </div>
        <button
          onClick={onClear}
          className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-[#042d24] hover:bg-[#073f32] text-emerald-300 hover:text-emerald-100 transition-colors border border-emerald-900/40 cursor-pointer"
        >
          Clear Console
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2.5 pr-2 scrollbar-thin scrollbar-thumb-emerald-900">
        {logs.length === 0 ? (
          <div className="text-emerald-900/80 italic flex items-center justify-center h-full">
            &gt; Standing by. No system telemetry requests received yet.
          </div>
        ) : (
          logs.map((log) => {
            const isError = log.status === 'ERROR';
            const isCached = log.status === 'CACHED';
            const isReset = log.status === 'RESET';
            
            let statusBadgeColor = 'text-emerald-300 bg-emerald-950/80 border-emerald-800/40';
            if (isError) {
              statusBadgeColor = 'text-rose-455 bg-rose-950/85 border-rose-900/50';
            } else if (isCached) {
              statusBadgeColor = 'text-amber-305 bg-amber-950/80 border-amber-900/50';
            } else if (isReset) {
              statusBadgeColor = 'text-sky-350 bg-sky-950/80 border-sky-900/50';
            }

            return (
              <div
                key={log.id}
                className={`p-2.5 rounded border transition-all ${
                  isError
                    ? 'bg-rose-950/10 border-rose-950/30'
                    : isCached
                    ? 'bg-amber-950/10 border-amber-950/30'
                    : isReset
                    ? 'bg-sky-950/10 border-sky-950/30'
                    : 'bg-[#032921]/60 border-emerald-900/40'
                }`}
              >
                {/* Meta details */}
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1 text-[11px] text-emerald-600/90">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-850 font-medium">{log.timestamp}</span>
                    <span className="font-extrabold text-emerald-450">
                      {log.method} {log.endpoint}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-850">Latency:</span>
                    <span className={log.latencyMs > 100 ? 'text-amber-500 font-bold' : 'text-emerald-400'}>
                      {log.latencyMs}ms
                    </span>
                    <span className="text-emerald-850">|</span>
                    <span className="text-emerald-850">HTTP Status:</span>
                    <span className={`font-extrabold ${isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {log.statusCode}
                    </span>
                  </div>
                </div>

                {/* Idempotency Key header log */}
                {log.idempotencyKey && (
                  <div className="text-[10px] text-emerald-700/80 mb-1 flex items-center gap-1">
                    <span className="font-bold text-emerald-800">Idempotency-Key:</span>
                    <span className="bg-[#011411] px-1.5 py-0.5 rounded select-all font-bold text-emerald-400">
                      {log.idempotencyKey}
                    </span>
                  </div>
                )}

                {/* Status tag & payload */}
                <div className="flex items-start gap-2 mt-1">
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-extrabold ${statusBadgeColor}`}>
                    {log.status === 'PROCESSED' && '[PROCESSED NEW]'}
                    {log.status === 'CACHED' && '[SERVED FROM CACHED IDEMPOTENCY]'}
                    {log.status === 'ERROR' && '[FAILED/ERROR]'}
                    {log.status === 'RESET' && '[SYSTEM DB RESET]'}
                  </span>
                  <div className="flex-1 overflow-x-auto text-[11px] text-emerald-300/90 whitespace-pre-wrap max-w-full font-mono">
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
