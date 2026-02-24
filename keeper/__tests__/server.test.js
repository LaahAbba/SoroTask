const http = require('http');
const { MetricsServer, Metrics } = require('../src/metrics');

describe('MetricsServer', () => {
    let server;
    let mockGasMonitor;
    let mockLogger;

    beforeEach(() => {
        mockGasMonitor = {
            getLowGasCount: jest.fn().mockReturnValue(0),
            getConfig: jest.fn().mockReturnValue({
                gasWarnThreshold: 500,
                alertWebhookEnabled: false,
                alertDebounceMs: 3600000
            })
        };
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
    });

    afterEach(() => {
        if (server) {
            server.stop();
            server = null;
        }
    });

    describe('Server lifecycle', () => {
        test('should start server on configured port', async () => {
            server = new MetricsServer(mockGasMonitor, mockLogger);
            server.port = 3002;
            server.start();

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(server.server).toBeDefined();
            expect(server.server.listening).toBe(true);
        });

        test('should stop server gracefully', async () => {
            server = new MetricsServer(mockGasMonitor, mockLogger);
            server.port = 3003;
            server.start();

            await new Promise(resolve => setTimeout(resolve, 50));

            const listening = server.server.listening;
            expect(listening).toBe(true);

            server.stop();

            expect(server.server.listening).toBe(false);
        });

        test('should use default port if not specified', () => {
            server = new MetricsServer(mockGasMonitor, mockLogger);
            expect(server.port).toBe(3000);
        });

        test('should use METRICS_PORT environment variable', () => {
            process.env.METRICS_PORT = '4000';
            server = new MetricsServer(mockGasMonitor, mockLogger);
            expect(server.port).toBe(4000);
            delete process.env.METRICS_PORT;
        });
    });

    describe('GET /health', () => {
        beforeEach(async () => {
            server = new MetricsServer(mockGasMonitor, mockLogger);
            server.port = 3004;
            server.start();
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('should return 200 OK when healthy', async () => {
            server.updateHealth({
                lastPollAt: new Date(),
                rpcConnected: true,
            });

            const response = await makeRequest(3004, '/health');

            expect(response.statusCode).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body.uptime).toBeGreaterThanOrEqual(0);
            expect(response.body.rpcConnected).toBe(true);
            expect(response.body.lastPollAt).toBeDefined();
        });

        test('should return 503 when last poll is stale', async () => {
            const stalePollTime = new Date(Date.now() - 70000);
            server.updateHealth({
                lastPollAt: stalePollTime,
                rpcConnected: true,
            });

            const response = await makeRequest(3004, '/health');

            expect(response.statusCode).toBe(503);
            expect(response.body.status).toBe('stale');
        });

        test('should return null lastPollAt if never polled', async () => {
            const response = await makeRequest(3004, '/health');

            expect(response.body.lastPollAt).toBeNull();
        });
    });

    describe('GET /metrics', () => {
        beforeEach(async () => {
            server = new MetricsServer(mockGasMonitor, mockLogger);
            server.port = 3005;
            server.start();
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('should return metrics snapshot', async () => {
            server.increment('tasksCheckedTotal', 10);
            server.increment('tasksExecutedTotal', 8);
            server.increment('tasksFailedTotal', 2);
            server.record('lastCycleDurationMs', 1523);

            const response = await makeRequest(3005, '/metrics');

            expect(response.statusCode).toBe(200);
            expect(response.body.tasksCheckedTotal).toBe(10);
            expect(response.body.tasksExecutedTotal).toBe(8);
            expect(response.body.tasksFailedTotal).toBe(2);
            expect(response.body.lastCycleDurationMs).toBe(1523);
        });

        test('should return metrics with default gas values', async () => {
            const response = await makeRequest(3005, '/metrics');

            expect(response.statusCode).toBe(200);
            expect(response.body.tasksCheckedTotal).toBe(0);
            expect(response.body.lowGasCount).toBe(0);
            expect(response.body.gasWarnThreshold).toBe(500);
        });
    });

    describe('Error handling', () => {
        beforeEach(async () => {
            server = new MetricsServer(mockGasMonitor, mockLogger);
            server.port = 3006;
            server.start();
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('should return 404 for unknown routes', async () => {
            const response = await makeRequest(3006, '/unknown');

            expect(response.statusCode).toBe(404);
        });
    });

    describe('updateHealth', () => {
        beforeEach(() => {
            server = new MetricsServer(mockGasMonitor, mockLogger);
        });

        test('should update lastPollAt', () => {
            const now = new Date();
            server.updateHealth({ lastPollAt: now });

            expect(server.metrics.lastPollAt).toEqual(now);
        });

        test('should update rpcConnected', () => {
            server.updateHealth({ rpcConnected: true });
            expect(server.metrics.rpcConnected).toBe(true);

            server.updateHealth({ rpcConnected: false });
            expect(server.metrics.rpcConnected).toBe(false);
        });

        test('should update partial state', () => {
            server.updateHealth({ rpcConnected: true });
            expect(server.metrics.rpcConnected).toBe(true);
            expect(server.metrics.lastPollAt).toBeNull();

            const now = new Date();
            server.updateHealth({ lastPollAt: now });
            expect(server.metrics.lastPollAt).toEqual(now);
            expect(server.metrics.rpcConnected).toBe(true);
        });
    });
});

function makeRequest(port, path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${port}${path}`, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        body: JSON.parse(data),
                    });
                } catch (err) {
                    // For 404 responses that aren't JSON
                    resolve({
                        statusCode: res.statusCode,
                        body: data,
                    });
                }
            });
        }).on('error', reject);
    });
}
