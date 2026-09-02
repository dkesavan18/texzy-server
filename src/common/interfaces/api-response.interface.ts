export type ApiSuccessResponse<T = unknown> = {
  success: true;
  error: null;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: string | string[];
  data: null;
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'success' in value && 'error' in value && 'data' in value;
}
