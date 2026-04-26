import Image from "next/image";
import TaskCreationForm from "./components/TaskCreationForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">S</div>
            <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
          </div>
          <button className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Create Task Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 shadow-xl">
              <TaskCreationForm />
            </div>
          </section>

          {/* Your Tasks Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 min-h-[300px] flex flex-col items-center justify-center text-neutral-500 shadow-xl">
              <p>No tasks registered yet.</p>
            </div>
          </section>
        </div>

        {/* Execution Logs */}
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Execution Logs</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-700/50 shadow-xl">
            <table className="w-full text-left text-sm text-neutral-400">
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
