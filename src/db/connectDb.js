const mongoose = require("mongoose");
const logger = require("../utils/logger");

let connectPromise = null;

mongoose.set("bufferCommands", false);

async function connectDb(context = {}) {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Set it in .env");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectPromise) {
    const serverSelectionTimeoutMs = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000);

    connectPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: serverSelectionTimeoutMs
    })
      .catch((error) => {
        logger.error("db-failure", {
          action: "connect",
          correlationId: context.correlationId,
          code: error?.code,
          error
        });
        throw error;
      })
      .finally(() => {
        connectPromise = null;
      });
  }

  await connectPromise;
}

module.exports = connectDb;

