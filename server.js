const dotenv = require("dotenv");
const app = require("./src/app");
const logger = require("./src/utils/logger");

dotenv.config();

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    logger.info("server-started", { port });
  });
}

module.exports = app;


