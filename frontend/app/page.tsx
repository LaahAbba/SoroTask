'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTaskContext } from './context/TaskContext';
import type { TaskSummary } from './hooks/useSocket';

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  registered: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active:     'bg-green-500/10 text-green-400 border-green-500/20',
  executing:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  failed:     'bg-red-500/10 text-red-400 border-red-500/20',
  low_gas:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  unknown:    'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
};

const STATUS_DOTS: Record<string, string> = {
  executing: 'animate-pulse bg-yellow-400',
  active:    'bg-green-400',
  registered:'bg-blue-400',
  failed:    'bg-red-400',
  low_gas:   'bg-orange-400',
  unknown:   'bg-neutral-400',
};

function StatusBadge({ status }: { status: TaskSummary['status'] }) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
  const dot    = STATUS_DOTS[status]   ?? STATUS_DOTS.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

// ─── Connection pill ─────────────────────────────────────────────────────────
function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border transition-colors
      ${connected
        ? 'bg-green-500/10 text-green-400 border-green-500/20'
        : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      {connected ? 'Live' : 'Reconnecting…'}
    </div>
  );
}

// ─── Relative time ────────────────────────────────────────────────────────────
function RelativeTime({ iso }: { iso?: string | null }) {
  const [label, setLabel] = useState('—');

  useEffect(() => {
    if (!iso) { setLabel('—'); return; }
    const compute = () => {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diff < 60) setLabel(`${diff}s ago`);
      else if (diff < 3600) setLabel(`${Math.floor(diff / 60)}m ago`);
      else setLabel(`${Math.floor(diff / 3600)}h ago`);
    };
    compute();
    const t = setInterval(compute, 5000);
    return () => clearInterval(t);
  }, [iso]);

  return <span>{label}</span>;
}

// ─── Metrics bar ─────────────────────────────────────────────────────────────
function MetricsBar() {
  const { state: { metrics, health } } = useTaskContext();

  const items = [
    { label: 'Checked',  value: metrics?.tasksCheckedTotal  ?? '–' },
    { label: 'Executed', value: metrics?.tasksExecutedTotal ?? '–' },
    { label: 'Failed',   value: metrics?.tasksFailedTotal   ?? '–' },
    { label: 'Cycle ms', value: metrics?.lastCycleDurationMs != null ? `${metrics.lastCycleDurationMs}ms` : '–' },
    { label: 'RPC',      value: health?.rpcConnected ? '✓' : health ? '✗' : '–' },
    { label: 'Uptime',   value: health ? `${health.uptime}s` : '–' },
  ];

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {items.map(({ label, value }) => (
        <div key={label} className="bg-neutral-800/60 border border-neutral-700/50 rounded-lg px-4 py-2 flex flex-col items-center min-w-[80px]">
          <span className="text-xs text-neutral-500 mb-0.5">{label}</span>
          <span className="text-sm font-semibold text-neutral-100">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
let _optimisticId = -1;

export default function Home() {
  const { state, optimisticAdd, confirmTask, rollbackTask } = useTaskContext();
  const { tasks, logs, connected, pendingIds } = state;

  // Form state
  const [form, setForm] = useState({ target: '', fn: '', interval: '3600', gas: '10' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.target.trim() || !form.fn.trim()) {
      setFormError('Target address and function name are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    // Optimistic add
    const tempId = _optimisticId--;
    const optimistic: TaskSummary = {
      id: tempId,
      status: 'registered',
      target: form.target,
      function: form.fn,
      interval: Number(form.interval),
      gas_balance: Number(form.gas),
      registeredAt: new Date().toISOString(),
    };
    optimisticAdd(optimistic);

    try {
      // In production, POST to your API route here.
      // For now we simulate a 800ms round-trip.
      await new Promise((res) => setTimeout(res, 800));
      confirmTask(tempId);
      setForm({ target: '', fn: '', interval: '3600', gas: '10' });
    } catch {
      rollbackTask(tempId);
      setFormError('Failed to register task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, optimisticAdd, confirmTask, rollbackTask]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">S</div>
            <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionPill connected={connected} />
            <button
              id="connect-wallet-btn"
              className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors text-sm"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 space-y-12">

        {/* Metrics */}
        <section>
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-widest mb-2">Keeper Stats</h2>
          <MetricsBar />
        </section>

        {/* Create + Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Register Task */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Register Task</h2>
            <form
              id="register-task-form"
              onSubmit={handleRegister}
              className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-6 space-y-4 shadow-xl"
            >
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Target Contract Address</label>
                <input
                  id="input-target"
                  name="target"
                  type="text"
                  value={form.target}
                  onChange={handleChange}
                  placeholder="C..."
                  className="w-full bg-neutral-950 border border-neutral-700/60 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Function Name</label>
                <input
                  id="input-fn"
                  name="fn"
                  type="text"
                  value={form.fn}
                  onChange={handleChange}
                  placeholder="harvest_yield"
                  className="w-full bg-neutral-950 border border-neutral-700/60 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Interval (seconds)</label>
                  <input
                    id="input-interval"
                    name="interval"
                    type="number"
                    value={form.interval}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-700/60 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Gas Balance (XLM)</label>
                  <input
                    id="input-gas"
                    name="gas"
                    type="number"
                    value={form.gas}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-700/60 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-red-400 text-xs">{formError}</p>
              )}

              <button
                id="submit-task-btn"
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {submitting ? 'Registering…' : 'Register Task'}
              </button>
            </form>
          </section>

          {/* Live Tasks */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Active Tasks</h2>
              <span className="text-xs text-neutral-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl shadow-xl overflow-hidden">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-600 text-sm gap-2">
                  <span className="text-2xl">📋</span>
                  <span>No tasks yet. Register one to get started.</span>
                </div>
              ) : (
                <ul id="tasks-list" className="divide-y divide-neutral-800">
                  {tasks.map((task) => {
                    const isPending = pendingIds.has(task.id);
                    return (
                      <li
                        key={task.id}
                        className={`px-5 py-4 flex items-start justify-between gap-4 transition-colors hover:bg-neutral-800/30 ${isPending ? 'opacity-60' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-neutral-400">#{task.id > 0 ? task.id : '…'}</span>
                            {isPending && <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">pending</span>}
                          </div>
                          <p className="text-sm font-mono text-neutral-200 truncate">{task.target ?? '—'}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{task.function ?? '—'} · every {task.interval}s</p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <StatusBadge status={task.status} />
                          <p className="text-[10px] text-neutral-600">
                            <RelativeTime iso={task.lastSuccessAt ?? task.updatedAt} />
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Live Event Log */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Live Event Log</h2>
            <span className="text-xs text-neutral-500">{logs.length} events</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-800 shadow-xl">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-900 text-neutral-300 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-medium">Task ID</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Message</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-950/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-neutral-600 text-xs">
                      No events yet — events will appear here in real time.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-neutral-300">#{log.taskId}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-5 py-3 text-neutral-400 max-w-xs truncate">{log.message}</td>
                      <td className="px-5 py-3 text-neutral-600 text-xs">
                        <RelativeTime iso={log.timestamp} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div ref={logsEndRef} />
          </div>
        </section>
      </main>
    </div>
  );
}
