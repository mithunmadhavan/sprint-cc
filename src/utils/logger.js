function log(level, message, meta = {}) {
  const error = meta.error;
  const safeMeta = { ...meta };
  delete safeMeta.error;

  const payload = {
    ts: new Date().toISOString(),
    level,
    service: "sprint-cc-backend",
    env: process.env.NODE_ENV || "development",
    pid: process.pid,
    message,
    ...safeMeta
  };

  if (error instanceof Error) {
    payload.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

function info(message, meta) {
  log("info", message, meta);
}

function error(message, meta) {
  log("error", message, meta);
}

module.exports = {
  info,
  error
};

