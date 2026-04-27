const fs = require('fs');
const path = require('path');

// Mock dependencies
const mockLogger = {
  info: (msg, meta) => console.log('INFO:', msg, meta || ''),
  warn: (msg, meta) => console.log('WARN:', msg, meta || ''),
  error: (msg, meta) => console.log('ERROR:', msg, meta || ''),
};

const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request.includes('logger')) {
    return { createLogger: () => mockLogger };
  }
  return originalLoad.apply(this, arguments);
};

const HistoryManager = require('../src/history');

async function test() {
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const HISTORY_FILE = path.join(DATA_DIR, 'executions.ndjson');

  if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);

  const history = new HistoryManager();

  console.log('Recording attempts...');
  history.record({ taskId: 101, status: 'SUCCESS', txHash: '0x123', feePaid: 0.1 });
  history.record({ taskId: 102, status: 'FAILED', error: 'Simulation failed' });

  console.log('Waiting for writes...');
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Verifying file exists:', fs.existsSync(HISTORY_FILE));
  
  const recent = await history.getRecent();
  console.log('Recent records:', JSON.stringify(recent, null, 2));

  if (recent.length === 2 && recent[0].taskId === 102) {
    console.log('Verification SUCCESS');
  } else {
    console.log('Verification FAILED');
    process.exit(1);
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
