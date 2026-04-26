import TransactionStatus from "@/components/transaction/TransactionStatus";
import Image from "next/image";

export default function Home() {
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
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 space-y-4 shadow-xl">
              <input placeholder="Target Contract Address" className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2" />
              <input placeholder="Function Name" className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Interval" className="bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2" />
                <input placeholder="Gas Balance" className="bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2" />
              </div>
              <button className="w-full bg-blue-600 py-3 rounded-lg">Register Task</button>
            </div>
          </section>

          {/* Your Tasks Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 min-h-[300px] flex items-center justify-center text-neutral-500">
              <p>No tasks registered yet.</p>
            </div>
          </section>
        </div>

        {/* Execution Logs */}
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Execution Logs</h2>

          <div className="overflow-hidden rounded-xl border border-neutral-700/50">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-800 text-neutral-200">
                <tr>
                  <th className="px-6 py-4">Task ID</th>
                  <th className="px-6 py-4">Target</th>
                  <th className="px-6 py-4">Keeper</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                <tr>
                  <td className="px-6 py-4">#1024</td>
                  <td className="px-6 py-4">CC...A12B</td>
                  <td className="px-6 py-4">GA...99X</td>
                  <td className="px-6 py-4">
                    <TransactionStatus status="success" compact />
                  </td>
                  <td className="px-6 py-4">2 mins ago</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Preview Section */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TransactionStatus
              status="pending"
              txHash="pending-submit"
              confirmations={0}
              requiredConfirmations={3}
            />

            <TransactionStatus
              status="confirming"
              txHash="cc3a...91fa"
              confirmations={2}
              requiredConfirmations={3}
            />

            <TransactionStatus
              status="failed"
              txHash="ab12...ff09"
            />
          </div>
        </section>
      </main>
    </div>
  );
}