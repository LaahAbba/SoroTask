import { loadConfig } from "./src/config.js";
import { createLogger } from "./src/logger.js";
import { createRpc } from "./src/rpc.js";
import { loadAccount } from "./src/account.js";
import { createPoller } from "./src/poller.js";
import { GasMonitor } from "./src/gasMonitor.js";
import { MetricsServer } from "./src/metrics.js";

async function main() {
  const config = loadConfig();
  const logger = createLogger();

  const gasMonitor = new GasMonitor(logger);
  const metricsServer = new MetricsServer(gasMonitor, logger);

  metricsServer.start();

  logger.info("Starting SoroTask Keeper...");
  logger.info("Configured network", {
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
  });

  const rpc = await createRpc(config, logger);
  const keeperAccount = loadAccount(config);

  logger.info("Keeper account loaded", {
    publicKey: keeperAccount.publicKey(),
  });

  const poller = createPoller({
    config,
    logger,
    rpc,
    keeperAccount,
    metricsServer,
  });

  poller.start();

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    await poller.stop?.();
    metricsServer.stop();
    logger.info("Shutdown complete.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Fatal Keeper Error:", err);
  process.exit(1);
});
