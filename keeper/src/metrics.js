const http = require('http');
const promClient = require('prom-client');
const { Server } = require('socket.io');

/**
 * Metrics store for tracking operational statistics.
 * Combines task execution metrics with gas monitoring metrics.
 */
class Metrics {
  constructor() {
    this.counters = {
      tasksCheckedTotal: 0,
      tasksDueTotal: 0,
      tasksExecutedTotal: 0,
      tasksFailedTotal: 0,
    };

    this.gauges = {
      avgFeePaidXlm: 0,
      lastCycleDurationMs: 0,
    };

    this.feeSamples = [];
    this.maxFeeSamples = 100;

    this.startTime = Date.now();
    this.lastPollAt = null;
    this.rpcConnected = false;
  }

  increment(key, amount = 1) {
    if (key in this.counters) {
      this.counters[key] += amount;
    }
  }

  record(key, value) {
    if (key === 'avgFeePaidXlm') {
      this.feeSamples.push(value);
      if (this.feeSamples.length > this.maxFeeSamples) {
        this.feeSamples.shift();
      }
      this.gauges.avgFeePaidXlm =
        this.feeSamples.reduce((sum, v) => sum + v, 0) /
        this.feeSamples.length;
    } else if (key in this.gauges) {
      this.gauges[key] = value;
    }
  }

  updateHealth(state) {
    if (state.lastPollAt) {
      this.lastPollAt = state.lastPollAt;
    }
    if (typeof state.rpcConnected === 'boolean') {
      this.rpcConnected = state.rpcConnected;
    }
  }

  snapshot() {
    return {
      ...this.counters,
      ...this.gauges,
    };
  }

  getHealthStatus(staleThreshold) {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);
    const isStale =
      this.lastPollAt &&
      now - this.lastPollAt.getTime() > staleThreshold;

    return {
      status: isStale ? 'stale' : 'ok',
      uptime: uptimeSeconds,
      lastPollAt: this.lastPollAt ? this.lastPollAt.toISOString() : null,
      rpcConnected: this.rpcConnected,
    };
  }

  reset() {
    this.counters = {
      tasksCheckedTotal: 0,
      tasksDueTotal: 0,
      tasksExecutedTotal: 0,
      tasksFailedTotal: 0,
    };
    this.gauges = {
      avgFeePaidXlm: 0,
      lastCycleDurationMs: 0,
    };
    this.feeSamples = [];
  }
}

class MetricsServer {
  constructor(gasMonitor, logger) {
    this.gasMonitor = gasMonitor;
    this.logger = logger;
    this.port = parseInt(process.env.METRICS_PORT, 10) || 3000;
    this.healthStaleThreshold = parseInt(
      process.env.HEALTH_STALE_THRESHOLD_MS || '60000',
      10,
    );
    this.server = null;
    this.io = null;
    this.registry = null;
    this.metrics = new Metrics();

    // Initialize Prometheus registry and metrics
    this.register = new promClient.Registry();
    this.initPrometheusMetrics();
  }

  setRegistry(registry) {
    this.registry = registry;
  }

  initPrometheusMetrics() {
    // Counter: Total tasks checked
    this.promTasksChecked = new promClient.Counter({
      name: 'keeper_tasks_checked_total',
      help: 'Total number of tasks checked for execution eligibility',
      registers: [this.register],
    });

    // Counter: Total tasks due for execution
    this.promTasksDue = new promClient.Counter({
      name: 'keeper_tasks_due_total',
      help: 'Total number of tasks that were due for execution',
      registers: [this.register],
    });

    // Counter: Total tasks executed successfully
    this.promTasksExecuted = new promClient.Counter({
      name: 'keeper_tasks_executed_total',
      help: 'Total number of tasks executed successfully',
      registers: [this.register],
    });

    // Counter: Total tasks failed
    this.promTasksFailed = new promClient.Counter({
      name: 'keeper_tasks_failed_total',
      help: 'Total number of tasks that failed during execution',
      registers: [this.register],
    });

    // Gauge: Average fee paid in XLM
    this.promAvgFee = new promClient.Gauge({
      name: 'keeper_avg_fee_paid_xlm',
      help: 'Average transaction fee paid in XLM (rolling average)',
      registers: [this.register],
    });

    // Gauge: Last cycle duration
    this.promCycleDuration = new promClient.Gauge({
      name: 'keeper_last_cycle_duration_ms',
      help: 'Duration of the last polling cycle in milliseconds',
      registers: [this.register],
    });

    // Gauge: Low gas count
    this.promLowGasCount = new promClient.Gauge({
      name: 'keeper_low_gas_count',
      help: 'Number of tasks with low gas balance',
      registers: [this.register],
    });

    // Gauge: Keeper uptime
    this.promUptime = new promClient.Gauge({
      name: 'keeper_uptime_seconds',
      help: 'Keeper service uptime in seconds',
      registers: [this.register],
    });

    // Gauge: RPC connection status (1 = connected, 0 = disconnected)
    this.promRpcConnected = new promClient.Gauge({
      name: 'keeper_rpc_connected',
      help: 'RPC connection status (1 = connected, 0 = disconnected)',
      registers: [this.register],
    });

    // Add default metrics (process CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });
  }

  syncPrometheusMetrics() {
    // Sync internal metrics to Prometheus metrics
    this.promTasksChecked.inc(0); // Initialize if not set
    this.promTasksDue.inc(0);
    this.promTasksExecuted.inc(0);
    this.promTasksFailed.inc(0);

    this.promAvgFee.set(this.metrics.gauges.avgFeePaidXlm);
    this.promCycleDuration.set(this.metrics.gauges.lastCycleDurationMs);
    this.promLowGasCount.set(this.gasMonitor.getLowGasCount());

    const uptimeSeconds = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    this.promUptime.set(uptimeSeconds);
    this.promRpcConnected.set(this.metrics.rpcConnected ? 1 : 0);
  }

  start() {
    this.server = http.createServer((req, res) => {
      // CORS headers for initial development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/health' || req.url === '/health/') {
        this.handleHealth(res);
      } else if (req.url === '/metrics' || req.url === '/metrics/') {
        this.handleMetrics(res);
      } else if (req.url === '/metrics/prometheus' || req.url === '/metrics/prometheus/') {
        this.handlePrometheusMetrics(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Initialize Socket.io
    this.io = new Server(this.server, {
      cors: {
        origin: '*', // For development, update in production
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      this.logger.info('Client connected via WebSocket', { socketId: socket.id });

      // Send initial state
      socket.emit('sync:metrics', this.metrics.snapshot());
      if (this.registry) {
        socket.emit('sync:tasks', this.registry.getTasksWithStats());
      }

      socket.on('disconnect', () => {
        this.logger.info('Client disconnected', { socketId: socket.id });
      });
    });

    this.server.listen(this.port, () => {
      this.logger.info(`Server running on port ${this.port}`);
      this.logger.info(`WebSocket enabled on http://localhost:${this.port}`);
    });
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  handleHealth(res) {
    const healthStatus = this.metrics.getHealthStatus(
      this.healthStaleThreshold,
    );
    const httpStatus = healthStatus.status === 'stale' ? 503 : 200;

    res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus, null, 2));
  }

  handleMetrics(res) {
    const gasConfig = this.gasMonitor.getConfig();
    const taskMetrics = this.metrics.snapshot();

    const metricsData = {
      // Task execution metrics
      ...taskMetrics,

      // Gas monitoring metrics
      lowGasCount: this.gasMonitor.getLowGasCount(),
      gasWarnThreshold: gasConfig.gasWarnThreshold,
      alertDebounceMs: gasConfig.alertDebounceMs,
      alertWebhookEnabled: gasConfig.alertWebhookEnabled,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metricsData, null, 2));
  }

  async handlePrometheusMetrics(res) {
    try {
      // Sync current metrics to Prometheus
      this.syncPrometheusMetrics();

      // Get Prometheus formatted metrics
      const metrics = await this.register.metrics();

      res.writeHead(200, { 'Content-Type': this.register.contentType });
      res.end(metrics);
    } catch (error) {
      this.logger.error('Error generating Prometheus metrics', { error: error.message });
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  updateHealth(state) {
    this.metrics.updateHealth(state);
    this.broadcast('sync:health', this.metrics.getHealthStatus(this.healthStaleThreshold));
  }

  increment(key, amount) {
    this.metrics.increment(key, amount);

    // Update Prometheus counters
    if (key === 'tasksCheckedTotal') {
      this.promTasksChecked.inc(amount);
    } else if (key === 'tasksDueTotal') {
      this.promTasksDue.inc(amount);
    } else if (key === 'tasksExecutedTotal') {
      this.promTasksExecuted.inc(amount);
    } else if (key === 'tasksFailedTotal') {
      this.promTasksFailed.inc(amount);
    }

    this.broadcast('sync:metrics', this.metrics.snapshot());
  }

  record(key, value) {
    this.metrics.record(key, value);

    // Update Prometheus gauges
    if (key === 'avgFeePaidXlm') {
      this.promAvgFee.set(this.metrics.gauges.avgFeePaidXlm);
    } else if (key === 'lastCycleDurationMs') {
      this.promCycleDuration.set(value);
    }

    this.broadcast('sync:metrics', this.metrics.snapshot());
  }

  stop() {
    if (this.io) {
      this.io.close();
    }
    if (this.server) {
      this.server.close();
      this.logger.info('Server stopped');
    }
  }
}

module.exports = { Metrics, MetricsServer };

