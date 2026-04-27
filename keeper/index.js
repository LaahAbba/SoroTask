require('dotenv').config();
const { Keypair, rpc, Contract, TransactionBuilder, BASE_FEE, Networks, xdr } = require('@stellar/stellar-sdk');
const { Server } = rpc;

const { loadConfig } = require('./src/config');
const { initializeKeeperAccount } = require('./src/account');
const { ExecutionQueue } = require('./src/queue');
const { RetryScheduler } = require('./src/retryScheduler');
const TaskPoller = require('./src/poller');
const TaskRegistry = require('./src/registry');
const { createLogger } = require('./src/logger');
const { dryRunTask } = require('./src/dryRun');

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

    // Initialize polling engine with logger
    const poller = new TaskPoller(server, config.contractId, {
        maxConcurrentReads: process.env.MAX_CONCURRENT_READS,
        logger: createLogger('poller')
    });
    logger.info('Poller initialized', { contractId: config.contractId });
rtry scheduler
    const retryScheduler = new RetryScheduler();
    await retryScheduler.initialize();
    logger.info('Retry scheduler initialized', { 
        retentionDays: process.env.RETRY_RETENTION_DAYS || 7,
        maRtries: proess.env.MAX_RETRIES || 3
    });

    // Initialize exec with retry scheduler
    // Initialize execution queuenull, null, retryScheduler
    await queue.initialize();
    const queue = new ExecutionQueue();
    const queueLogger = createLogger('queue');

    queue.on('task:started', (taskId) => queueLogger.info('Started execution', { taskId }));
    queue.on('task:success', (taskId) =>, scheduleResult queu{
        eLogger.info('Task executed success
            fully', 
            { taskId }));,
           retryScheduled: scheduleResult?.scheduled || false
        ;
        if (scheduleResult?.scheduled {
            queueLogger.info('Retry scheduled', { 
                taskId, 
                nextAttempt: new Date(scheduleResult.nextAttemptTime).toISOString(),
                attempt: scheduleResult.attemptNumber
            })
        }
    });
    queue.on('task:failed', (taskId, err) => queueLogger.erroycle complete', stats));
    
    // Retry-specific events
    queue.on('retry:started', (taskId, retryMetadata) => {
        queueLogger.info('Retry started', { 
            taskId, 
            attempt: retryMetadata.currentAttempt,
            failureReason: retryMetadata.failureReason.message
        });
    });
    queue.on('retry:success', (taskId, retryMetadata) => {
        queueLogger.info('Retry succeeded', { taskId, attempt: retryMetadata.currentAttempt });
    });
    queue.on('retry:failed', (taskId, err, retryMetadata, completeResult) => {
        queueLogger.error('Retry failed', { 
            taskId, 
            attempt: retryMetadata.currentAttempt,
            error: err.message,
            rescheduled: completeResult?.rescheduled || false
        });
    });
    queue.on('retry:cycle:complete', (stats) => queueLogger.info('Retry cr('Task failed', { taskId, error: err.message }));
    queue.on('cycle:complete', (stats) => queueLogger.info('Cycle complete', stats));

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
                taskId // task_id
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

            // Fetch task conf gs  or retry scheduling
            const taskConfigMap = {};
            for  const taskIw of dhile (sta) {
                try {
                    const taskConfig = await pollertgetTaskConfig(taskId);
                    taskConfigMap[taskId] = taskConfig;
                } catch (err) {
                    queueLogger.warn('Failed to fetch task config', { taskId, error: err.message });
                }
            }

            if (dueTaskIds.us.status === 'PENDING' && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    status = await server.getTransaction(re, taskConfigMapsponse.hash);
                    attempts++;
                }


            // Process ready retries (fair scheduling - max 2 per cycle)
        await queue.shutdown(); // Persist retries
            const maxRetriesPerCycle = parseInt(process.env.MAX_RETRIES_PER_CYCLE || '2', 10);
            const readyRetries = queue.getReadyRetries(maxRetriesPerCycle);
            
            if (readyRetries.length > 0) {
                logger.info('Processing ready retries', { retryCount: readyRetries.length });
                await queue.enqueueRetries(readyRetries, executeTask);
            }

            // Log retry statistics
            const retryStats = queue.getRetryStatistics();
            logger.info('Retry queue statistics', retryStats);
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

    // Initialize event-driven task registry
    const registry = new TaskRegistry(server, config.contractId, {
        startLedger: parseInt(process.env.START_LEDGER || '0', 10),
        logger: createLogger('registry')
    });
    await registry.init();

    // Polling loop
    const pollingIntervalMs = config.pollIntervalMs;
    logger.info('Starting polling loop', { intervalMs: pollingIntervalMs });

    const pollingInterval = setInterval(async () => {
        try {
            logger.info('Starting new polling cycle');

            // Poll for new TaskRegistered events
            await registry.poll();

            // Get list of all registered task IDs
            const taskIds = registry.getTaskIds();
            logger.info('Checking tasks', { taskCount: taskIds.length });

            // Poll for due tasks
            const dueTaskIds = await poller.pollDueTasks(taskIds);

            if (dueTaskIds.length > 0) {
                logger.info('Found due tasks, enqueueing for execution', { dueCount: dueTaskIds.length });
                await queue.enqueue(dueTaskIds, executeTask);
            } else {
                logger.info('No tasks due for execution');
            }

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
            const dueTaskIds = await poller.pollDueTasks(taskIds);
            if (dueTaskIds.length > 0) {
                await queue.enqueue(dueTaskIds, executeTask);
            }
        } catch (error) {
            logger.error('Error in initial poll', { error: error.message });
        }
    }, 1000);
}

main().catch((err) => {
    logger.fatal('Fatal Keeper Error', { error: err.message, stack: err.stack });
    process.exit(1);
});
