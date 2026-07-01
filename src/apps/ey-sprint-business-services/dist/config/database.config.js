"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('database', () => ({
    uri: process.env.MONGO_URI,
    serverSelectionTimeoutMs: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? '5000', 10),
}));
//# sourceMappingURL=database.config.js.map