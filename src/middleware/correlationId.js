const { randomUUID } = require("node:crypto");

const CORRELATION_HEADER = "x-correlation-id";
const REQUEST_ID_HEADER = "x-request-id";

function normalizeHeaderValue(value) {
  if (!value) return "";
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value).trim();
}

function correlationId(req, res, next) {
  const incomingCorrelationId = normalizeHeaderValue(req.headers[CORRELATION_HEADER]);
  const incomingRequestId = normalizeHeaderValue(req.headers[REQUEST_ID_HEADER]);
  const id = incomingCorrelationId || incomingRequestId || randomUUID();

  req.correlationId = id;
  res.setHeader("X-Correlation-Id", id);
  next();
}

module.exports = correlationId;

