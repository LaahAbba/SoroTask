require('dotenv').config();
const { Keypair, rpc, Contract, TransactionBuilder, BASE_FEE, Networks, xdr } = require('@stellar/stellar-sdk');
const { Server } = rpc;

const { loadConfig } = require('./src/config');
const { initializeKeeperAccount } = require('./src/account');
const { ExecutionQueue } = require('./src/queue');
const TaskPoller = require('./src/poller');
const TaskRegistry = require('./src/registry');
const { createLogger } = require('./src/logger');
const { dryRunTask } = require('./src/dryRun');
const { MetricsServer } = require('./src/metrics');

// Create root logger for the main module
const logger = createLogger('keeper');

// Parse --dry-run flag from CLI arguments
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    if (DRY_RUN) {
        logger.info('Starting SoroTask Keeper in DRY-RUN mode — no transactions will be submitted');
    } else {
        logger.info('Starting SoroTask Keeper');
    }

    let config;
    try {
        config = loadConfig();
        logger.info('Configuration loaded', { 
            network: config.networkPassphrase,
            rpcUrl: config.rpcUrl 
        });
    } catch (err) {
        logger.error('Configuration error', { error: err.message });
        process.exit(1);
    }

    let keeperData;
    try {
        keeperData = await initializeKeeperAccount();
    } catch (err) {
        logger.error('Failed to initialize keeper', { error: err.message });
        process.exit(1);
    }

    const { keypair, accountResponse } = keeperData;
    const server = new Server(config.rpcUrl);

    // Initialize metrics and WebSocket server
    const metricsServer = new MetricsServer({ getLowGasCount: () => 0, getConfig: () => ({}) }, createLogger('metrics'));
    metricsServer.start();

    // Initialize polling engine with logger
    const poller = new TaskPoller(server, config.contractId, {
        maxConcurrentReads: process.env.MAX_CONCURRENT_READS,
        logger: createLogger('poller')
    });
    logger.info('Poller initialized', { contractId: config.contractId });

    // Initialize execution queue
    const queue = new ExecutionQueue();
    const queueLogger = createLogger('queue');

    // Initialize event-driven task registry
    const registry = new TaskRegistry(server, config.contractId, {
        startLedger: parseInt(process.env.START_LEDGER || '0', 10),
        logger: createLogger('registry')
    });
    await registry.init();

    metricsServer.setRegistry(registry);

    // Wire up events
    queue.on('task:started', (taskId) => {
        queueLogger.info('Started execution', { taskId });
        registry.updateTask(taskId, { status: 'executing', lastStartedAt: new Date().toISOString() });
        metricsServer.broadcast('task:updated', { taskId, status: 'executing' });
    });
    queue.on('task:success', (taskId) => {
        queueLogger.info('Task executed successfully', { taskId });
        registry.updateTask(taskId, { status: 'active', lastSuccessAt: new Date().toISOString() });
        metricsServer.increment('tasksExecutedTotal');
        metricsServer.broadcast('task:updated', { taskId, status: 'active', lastSuccess: new Date().toISOString() });
    });
    queue.on('task:failed', (taskId, err) => {
        queueLogger.error('Task failed', { taskId, error: err.message });
        registry.updateTask(taskId, { status: 'failed', lastError: err.message, lastFailedAt: new Date().toISOString() });
        metricsServer.increment('tasksFailedTotal');
        metricsServer.broadcast('task:updated', { taskId, status: 'failed', error: err.message });
    });
    queue.on('cycle:complete', (stats) => {
        queueLogger.info('Cycle complete', stats);
        metricsServer.record('lastCycleDurationMs', stats.durationMs);
    });

    // Task executor function - calls contract.execute(keeper, task_id)
    // In dry-run mode, simulates the transaction without submitting it.
    const executeTask = async (taskId) => {
        const account = await server.getAccount(keypair.publicKey());
        const deps = {
            server,
            keypair,
            account,
            contractId: config.contractId,
            networkPassphrase: config.networkPassphrase || Networks.FUTURENET,
        };

        if (DRY_RUN) {
            const result = await dryRunTask(taskId, deps);
            logger.info('Dry-run result', { taskId, status: result.status, estimatedFee: result.simulation?.estimatedFee ?? null, error: result.error });
            return;
        }

        try {
            // Build the execute transaction
            const contract = new Contract(config.contractId);

            const operation = contract.call(
                'execute',
                keypair.publicKey(), // keeper address
                xdr.ScVal.scvU64(xdr.Uint64.fromString(taskId.toString()))
            );

            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: config.networkPassphrase || Networks.FUTURENET
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();

            transaction.sign(keypair);

            // Submit the transaction
            const response = await server.sendTransaction(transaction);
            logger.info('Task transaction submitted', { taskId, hash: response.hash });

            // Wait for confirmation (optional, can be made configurable)
            if (process.env.WAIT_FOR_CONFIRMATION !== 'false') {
                let status = await server.getTransaction(response.hash);
                let attempts = 0;
                const maxAttempts = 10;

                while (status.status === 'PENDING' && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    status = await server.getTransaction(response.hash);
                    attempts++;
                }

                if (status.status === 'SUCCESS') {
                    logger.info('Task executed successfully', { taskId });
                } else {
                    throw new Error(`Transaction failed with status: ${status.status}`);
                }
            }

        } catch (error) {
            logger.error('Failed to execute task', { taskId, error: error.message });
            throw error;
        }
    };

    // Polling loop
    const pollingIntervalMs = config.pollIntervalMs;
    logger.info('Starting polling loop', { intervalMs: pollingIntervalMs });

    const pollingInterval = setInterval(async () => {
        const startTime = Date.now();
        try {
            logger.info('Starting new polling cycle');

            // Poll for new TaskRegistered events
            const oldTaskCount = registry.getTaskIds().length;
            await registry.poll();
            const newTaskCount = registry.getTaskIds().length;
            
            if (newTaskCount > oldTaskCount) {
                metricsServer.broadcast('sync:tasks', registry.getTasksWithStats());
            }

            // Get list of all registered task IDs
            const taskIds = registry.getTaskIds();
            logger.info('Checking tasks', { taskCount: taskIds.length });

            // Poll for due tasks
            const dueTaskIds = await poller.pollDueTasks(taskIds, { registry });
            
            // Broadcast updates if tasks were checked (registry.updateTask called)
            metricsServer.broadcast('sync:tasks', registry.getTasksWithStats());

            if (dueTaskIds.length > 0) {
                logger.info('Found due tasks, enqueueing for execution', { dueCount: dueTaskIds.length });
                metricsServer.increment('tasksDueTotal', dueTaskIds.length);
                await queue.enqueue(dueTaskIds, executeTask);
            } else {
                logger.info('No tasks due for execution');
            }

            metricsServer.increment('tasksCheckedTotal', taskIds.length);
            metricsServer.record('lastCycleDurationMs', Date.now() - startTime);
            logger.info('Polling cycle complete');

        } catch (error) {
            logger.error('Error in polling cycle', { error: error.message });
        }
    }, pollingIntervalMs);

    // Graceful shutdown handling
    const shutdown = async (signal) => {
        logger.info('Received shutdown signal, starting graceful shutdown', { signal });
        clearInterval(pollingInterval);
        await queue.drain();
        metricsServer.stop();
        logger.info('Graceful shutdown complete, exiting');
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Run first poll immediately
    logger.info('Running initial poll');
    setTimeout(async () => {
        try {
            const taskIds = registry.getTaskIds();
            const dueTaskIds = await poller.pollDueTasks(taskIds, { registry });
            if (dueTaskIds.length > 0) {
                await queue.enqueue(dueTaskIds, executeTask);
            }
            metricsServer.broadcast('sync:tasks', registry.getTasksWithStats());
        } catch (error) {
            logger.error('Error in initial poll', { error: error.message });
        }
    }, 1000);
}

main().catch((err) => {
    logger.fatal('Fatal Keeper Error', { error: err.message, stack: err.stack });
    process.exit(1);
});

