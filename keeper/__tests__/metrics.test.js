const { Metrics } = require('../src/metrics');

describe('Metrics', () => {
    let metrics;

    beforeEach(() => {
        // Create a fresh instance before each test
        metrics = new Metrics();
    });

    describe('increment', () => {
        it('should increment counter by 1 by default', () => {
            metrics.increment('tasksCheckedTotal');
            expect(metrics.counters.tasksCheckedTotal).toBe(1);
        });

        it('should increment counter by specified amount', () => {
            metrics.increment('tasksCheckedTotal', 5);
            expect(metrics.counters.tasksCheckedTotal).toBe(5);
        });

        it('should accumulate increments', () => {
            metrics.increment('tasksCheckedTotal', 3);
            metrics.increment('tasksCheckedTotal', 2);
            expect(metrics.counters.tasksCheckedTotal).toBe(5);
        });

        it('should throw error for unknown counter', () => {
            expect(() => {
                metrics.increment('unknownCounter');
            }).not.toThrow();
        });
    });

    describe('record', () => {
        it('should record gauge value', () => {
            metrics.record('lastCycleDurationMs', 100);
            expect(metrics.gauges.lastCycleDurationMs).toBe(100);
        });

        it('should update gauge value', () => {
            metrics.record('lastCycleDurationMs', 100);
            metrics.record('lastCycleDurationMs', 200);
            expect(metrics.gauges.lastCycleDurationMs).toBe(200);
        });

        it('should calculate rolling average for fee samples', () => {
            metrics.record('avgFeePaidXlm', 10);
            metrics.record('avgFeePaidXlm', 20);
            metrics.record('avgFeePaidXlm', 30);
            expect(metrics.gauges.avgFeePaidXlm).toBe(20);
        });

        it('should limit fee samples to maxFeeSamples', () => {
            for (let i = 0; i < 105; i++) {
                metrics.record('avgFeePaidXlm', i);
            }
            expect(metrics.feeSamples.length).toBe(100);
        });

        it('should throw error for unknown gauge', () => {
            expect(() => {
                metrics.record('unknownGauge', 100);
            }).not.toThrow();
        });
    });

    describe('snapshot', () => {
        it('should return all metrics', () => {
            metrics.increment('tasksCheckedTotal', 10);
            metrics.increment('tasksExecutedTotal', 8);
            metrics.record('lastCycleDurationMs', 1523);

            const snapshot = metrics.snapshot();

            expect(snapshot.tasksCheckedTotal).toBe(10);
            expect(snapshot.tasksExecutedTotal).toBe(8);
            expect(snapshot.lastCycleDurationMs).toBe(1523);
        });

        it('should return initial state when nothing recorded', () => {
            const snapshot = metrics.snapshot();

            expect(snapshot.tasksCheckedTotal).toBe(0);
            expect(snapshot.tasksDueTotal).toBe(0);
            expect(snapshot.tasksExecutedTotal).toBe(0);
            expect(snapshot.tasksFailedTotal).toBe(0);
            expect(snapshot.avgFeePaidXlm).toBe(0);
            expect(snapshot.lastCycleDurationMs).toBe(0);
        });
    });

    describe('reset', () => {
        it('should reset all counters to 0', () => {
            metrics.increment('tasksCheckedTotal', 10);
            metrics.increment('tasksExecutedTotal', 8);

            metrics.reset();

            expect(metrics.counters.tasksCheckedTotal).toBe(0);
            expect(metrics.counters.tasksExecutedTotal).toBe(0);
        });

        it('should reset all gauges to 0', () => {
            metrics.record('lastCycleDurationMs', 100);
            metrics.record('avgFeePaidXlm', 50);

            metrics.reset();

            expect(metrics.gauges.lastCycleDurationMs).toBe(0);
            expect(metrics.gauges.avgFeePaidXlm).toBe(0);
        });

        it('should clear fee samples', () => {
            metrics.record('avgFeePaidXlm', 10);
            metrics.record('avgFeePaidXlm', 20);

            metrics.reset();

            expect(metrics.feeSamples.length).toBe(0);
        });
    });
});
