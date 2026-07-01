import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { RolesModule } from './modules/roles/roles.module';
import { TeamsModule } from './modules/teams/teams.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    // Config module – loads .env and makes ConfigService available globally
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Mongoose connection driven by config
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
        serverSelectionTimeoutMS: config.get<number>(
          'database.serverSelectionTimeoutMs',
          5000,
        ),
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    SprintsModule,
    RolesModule,
    TeamsModule,
    SubmissionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

