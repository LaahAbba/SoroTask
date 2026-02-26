// Simple queue tests
const { ExecutionQueue } = require('../src/queue');

describe('ExecutionQueue', () => {
    let queue;

    beforeEach(() => {
        queue = new ExecutionQueue();
    });

    it('should create ExecutionQueue instance', () => {
        expect(queue).toBeDefined();
    });

    it('should have concurrency limit', () => {
        expect(queue.concurrencyLimit).toBeDefined();
    });

    it('should have depth of 0 initially', () => {
        expect(queue.depth).toBe(0);
    });

    it('should have inFlight of 0 initially', () => {
        expect(queue.inFlight).toBe(0);
    });

    it('should have completed of 0 initially', () => {
        expect(queue.completed).toBe(0);
    });
});
