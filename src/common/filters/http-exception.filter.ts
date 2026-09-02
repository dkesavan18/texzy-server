import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = this.extractErrorMessage(exception);
    } else if (exception instanceof Error) {
      error = exception.message;
    }

    const body: ApiErrorResponse = {
      success: false,
      error,
      data: null,
    };

    response.status(status).json(body);
  }

  private extractErrorMessage(exception: HttpException): string | string[] {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as Record<string, unknown>;

      if (Array.isArray(body.message)) {
        return body.message.map(String);
      }

      if (typeof body.message === 'string') {
        return body.message;
      }
    }

    return exception.message;
  }
}
