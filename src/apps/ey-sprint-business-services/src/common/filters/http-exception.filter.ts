import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) ?? exception.message;
        if (resp.message && Array.isArray(resp.message)) {
          // Validation errors – flatten to string
          message = (resp.message as string[]).join('; ');
          details = resp.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      const err = exception as Error & { statusCode?: number };
      if (err.statusCode) {
        status = err.statusCode;
      }
    }

    this.logger.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        service: 'ey-sprint-business-services',
        correlationId: (request as any).correlationId,
        method: request.method,
        path: request.path,
        status,
        message,
      }),
    );

    const body: Record<string, unknown> = { error: message };
    if (details !== undefined) body.details = details;

    response.status(status).json(body);
  }
}

