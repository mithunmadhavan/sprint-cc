import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, correlationId } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const durationMs = Date.now() - start;
        this.logger.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            service: 'ey-sprint-business-services',
            correlationId,
            method,
            path,
            statusCode: response.statusCode,
            durationMs,
          }),
        );
      }),
    );
  }
}

