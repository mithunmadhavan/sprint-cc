"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const sprints_module_1 = require("./modules/sprints/sprints.module");
const roles_module_1 = require("./modules/roles/roles.module");
const teams_module_1 = require("./modules/teams/teams.module");
const submissions_module_1 = require("./modules/submissions/submissions.module");
const correlation_id_middleware_1 = require("./common/middleware/correlation-id.middleware");
const app_config_1 = require("./config/app.config");
const database_config_1 = require("./config/database.config");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(correlation_id_middleware_1.CorrelationIdMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default],
                envFilePath: ['.env.local', '.env'],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get('database.uri'),
                    serverSelectionTimeoutMS: config.get('database.serverSelectionTimeoutMs', 5000),
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            sprints_module_1.SprintsModule,
            roles_module_1.RolesModule,
            teams_module_1.TeamsModule,
            submissions_module_1.SubmissionsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map