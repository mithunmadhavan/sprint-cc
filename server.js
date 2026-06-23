const dotenv = require("dotenv");

// Load .env only for local development — Vercel injects env vars at runtime from its own store
if (!process.env.VERCEL) {
  dotenv.config();
}

const app = require("./src/app");
const logger = require("./src/utils/logger");


if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    logger.info("server-started", { port });
  });
}

module.exports = app;


