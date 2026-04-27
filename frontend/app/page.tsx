"use client";

import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleRegisterTask = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newTask = {
      id: Math.floor(Math.random() * 10000),
      target: formData.get("target"),
      functionName: formData.get("functionName"),
      interval: formData.get("interval"),
      gas: formData.get("gas"),
      status: "Active",
      timestamp: "Just now",
    };
    setTasks([...tasks, newTask]);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              S
            </div>
            <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
          </div>
          <button
            onClick={handleConnect}
            data-testid="connect-wallet-button"
            className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors"
          >
            {isConnected ? "0x...4e2a" : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Create Task Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <form
              onSubmit={handleRegisterTask}
              data-testid="register-task-form"
              className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 space-y-4 shadow-xl"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Target Contract Address
                </label>
                <input
                  name="target"
                  required
                  data-testid="target-contract-input"
                  type="text"
                  placeholder="C..."
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Function Name
                </label>
                <input
                  name="functionName"
                  required
                  data-testid="function-name-input"
                  type="text"
                  placeholder="harvest_yield"
                  className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Interval (seconds)
                  </label>
                  <input
                    name="interval"
                    required
                    data-testid="interval-input"
                    type="number"
                    placeholder="3600"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Gas Balance (XLM)
                  </label>
                  <input
                    name="gas"
                    required
                    data-testid="gas-balance-input"
                    type="number"
                    placeholder="10"
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                data-testid="register-task-button"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-blue-600/20"
              >
                Register Task
              </button>
            </form>
          </section>

          {/* Your Tasks Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <div
              data-testid="tasks-container"
              className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 min-h-[300px] flex flex-col items-center justify-center text-neutral-500 shadow-xl"
            >
              {tasks.length === 0 ? (
                <p data-testid="empty-tasks-message">No tasks registered yet.</p>
              ) : (
                <div className="w-full space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      data-testid="task-item"
                      className="bg-neutral-900 border border-neutral-700/50 rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-mono text-sm text-neutral-300">
                          {task.target}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {task.functionName} • {task.interval}s
                        </p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Execution Logs */}
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Execution Logs</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-700/50 shadow-xl">
            <table
              data-testid="execution-logs-table"
              className="w-full text-left text-sm text-neutral-400"
            >
              <thead className="bg-neutral-800/80 text-neutral-200 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Task ID</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Keeper</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/50">
                {/* Mock Row */}
                <tr className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-neutral-300">#1024</td>
                  <td className="px-6 py-4 font-mono">CC...A12B</td>
                  <td className="px-6 py-4 font-mono">GA...99X</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      Success
                    </span>
                  </td>
                  <td className="px-6 py-4">2 mins ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

