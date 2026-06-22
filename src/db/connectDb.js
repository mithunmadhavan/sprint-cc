const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDb(context = {}) {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Set it in .env");
  }

  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri);
    } catch (error) {
      logger.error("db-failure", {
        action: "connect",
        correlationId: context.correlationId,
        code: error?.code,
        error
      });
      throw error;
    }
  }
}

module.exports = connectDb;

