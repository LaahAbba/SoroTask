const { GasMonitor } = require('../src/gasMonitor');

describe('GasMonitor', () => {
    let gasMonitor;
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        process.env.GAS_WARN_THRESHOLD = '500';
        process.env.ALERT_WEBHOOK_URL = 'https://webhook.example.com/alert';
        process.env.ALERT_DEBOUNCE_MS = '3600000';

        gasMonitor = new GasMonitor(mockLogger);
    });

    afterEach(() => {
        delete process.env.GAS_WARN_THRESHOLD;
        delete process.env.ALERT_WEBHOOK_URL;
        delete process.env.ALERT_DEBOUNCE_MS;
    });

    describe('constructor', () => {
        it('initializes with default values when environment variables are not set', () => {
            delete process.env.GAS_WARN_THRESHOLD;
            delete process.env.ALERT_WEBHOOK_URL;
            delete process.env.ALERT_DEBOUNCE_MS;

            const monitor = new GasMonitor(mockLogger);

            expect(monitor.GAS_WARN_THRESHOLD).toBe(500);
            expect(monitor.ALERT_WEBHOOK_URL).toBeNull();
            expect(monitor.ALERT_DEBOUNCE_MS).toBe(3600000);
            expect(monitor.tasksLowGasCount).toBe(0);
        });

        it('uses environment variables when set', () => {
            process.env.GAS_WARN_THRESHOLD = '1000';
            process.env.ALERT_WEBHOOK_URL = 'https://test.com/webhook';
            process.env.ALERT_DEBOUNCE_MS = '7200000';

            const monitor = new GasMonitor(mockLogger);

            expect(monitor.GAS_WARN_THRESHOLD).toBe(1000);
            expect(monitor.ALERT_WEBHOOK_URL).toBe('https://test.com/webhook');
            expect(monitor.ALERT_DEBOUNCE_MS).toBe(7200000);
        });
    });

    describe('checkGasBalance', () => {
        it('logs warning when gas balance is below threshold but greater than 0', async () => {
            const taskId = '123';
            const gasBalance = 400;

            const shouldSkip = await gasMonitor.checkGasBalance(taskId, gasBalance);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Task ${taskId} has low gas balance (${gasBalance}). Threshold: ${gasMonitor.GAS_WARN_THRESHOLD}`
            );
            expect(shouldSkip).toBe(false);
        });

        it('logs error and returns true when gas balance is zero or negative', async () => {
            const taskId = '123';
            const gasBalance = 0;

            const shouldSkip = await gasMonitor.checkGasBalance(taskId, gasBalance);

            expect(mockLogger.error).toHaveBeenCalledWith(
                `Task ${taskId} has critically low gas balance (${gasBalance}). Skipping execution.`
            );
            expect(shouldSkip).toBe(true);
        });

        it('does not log warning when gas balance is above threshold', async () => {
            const taskId = '123';
            const gasBalance = 600;

            const shouldSkip = await gasMonitor.checkGasBalance(taskId, gasBalance);

            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.error).not.toHaveBeenCalled();
            expect(shouldSkip).toBe(false);
        });

        it('tracks low gas count correctly', async () => {
            await gasMonitor.checkGasBalance('1', 400);
            expect(gasMonitor.getLowGasCount()).toBe(1);

            await gasMonitor.checkGasBalance('2', 300);
            expect(gasMonitor.getLowGasCount()).toBe(2);

            await gasMonitor.checkGasBalance('3', 600);
            expect(gasMonitor.getLowGasCount()).toBe(2);

            await gasMonitor.checkGasBalance('3', 200);
            expect(gasMonitor.getLowGasCount()).toBe(3);

            await gasMonitor.checkGasBalance('1', 600);
            expect(gasMonitor.getLowGasCount()).toBe(2);
        });
    });

    describe('metrics methods', () => {
        it('returns correct low gas count', () => {
            expect(gasMonitor.getLowGasCount()).toBe(0);

            gasMonitor.tasksLowGasCount = 5;
            expect(gasMonitor.getLowGasCount()).toBe(5);
        });

        it('returns correct configuration', () => {
            const config = gasMonitor.getConfig();

            expect(config.gasWarnThreshold).toBe(gasMonitor.GAS_WARN_THRESHOLD);
            expect(config.alertWebhookEnabled).toBe(!!gasMonitor.ALERT_WEBHOOK_URL);
            expect(config.alertDebounceMs).toBe(gasMonitor.ALERT_DEBOUNCE_MS);
        });
    });
});
