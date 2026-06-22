const logger = require("../utils/logger");

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const correlationId = req.correlationId || "n/a";

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    logger.info("api-call", {
      correlationId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
      userAgent: req.get("user-agent") || ""
    });
  });

  next();
}

module.exports = requestLogger;

