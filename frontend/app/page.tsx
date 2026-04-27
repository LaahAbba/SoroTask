import { Button } from './components/Button';
import { Card } from './components/Card';
import { Input } from './components/Input';
import { Badge } from './components/Badge';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-primary-foreground shadow-lg shadow-primary-500/20">
              S
            </div>
            <h1 className="text-xl font-bold tracking-tight">SoroTask</h1>
          </div>
          <Button variant="secondary" size="md">
            Connect Wallet
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Create Task Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Create Automation Task</h2>
            <Card variant="elevated" padding="lg">
              <div className="space-y-4">
                <Input
                  label="Target Contract Address"
                  placeholder="C..."
                  size="md"
                  fullWidth
                />
                <Input
                  label="Function Name"
                  placeholder="harvest_yield"
                  size="md"
                  fullWidth
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Interval (seconds)"
                    type="number"
                    placeholder="3600"
                    size="md"
                    fullWidth
                  />
                  <Input
                    label="Gas Balance (XLM)"
                    type="number"
                    placeholder="10"
                    size="md"
                    fullWidth
                  />
                </div>
                <Button variant="primary" size="lg" fullWidth>
                  Register Task
                </Button>
              </div>
            </Card>
          </section>

          {/* Your Tasks Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Your Tasks</h2>
            <Card variant="elevated" padding="lg">
              <div className="min-h-[300px] flex flex-col items-center justify-center text-neutral-500">
                <p>No tasks registered yet.</p>
              </div>
            </Card>
          </section>
        </div>

        {/* Execution Logs */}
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Execution Logs</h2>
          <Card variant="elevated" padding="sm">
            <div className="overflow-hidden">
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
                    <td className="px-6 py-4 font-mono text-neutral-300">
                      #1024
                    </td>
                    <td className="px-6 py-4 font-mono">CC...A12B</td>
                    <td className="px-6 py-4 font-mono">GA...99X</td>
                    <td className="px-6 py-4">
                      <Badge variant="success">Success</Badge>
                    </td>
                    <td className="px-6 py-4">2 mins ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
