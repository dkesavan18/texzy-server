import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { isApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse> {
    return next.handle().pipe(
      map((data) => {
        if (isApiResponse(data)) {
          return data as ApiSuccessResponse;
        }

        return {
          success: true,
          error: null,
          data: data ?? null,
        };
      }),
    );
  }
}
