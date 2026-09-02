import { lastValueFrom, of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  const interceptor = new TransformResponseInterceptor();

  it('wraps successful payloads', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, { handle: () => of({ id: 1 }) }),
    );

    expect(result).toEqual({
      success: true,
      error: null,
      data: { id: 1 },
    });
  });

  it('wraps array payloads', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, { handle: () => of([{ id: 1 }]) }),
    );

    expect(result).toEqual({
      success: true,
      error: null,
      data: [{ id: 1 }],
    });
  });

  it('does not double-wrap already formatted responses', async () => {
    const wrapped = { success: true, error: null, data: { ok: true } };
    const result = await lastValueFrom(
      interceptor.intercept({} as never, { handle: () => of(wrapped) }),
    );

    expect(result).toBe(wrapped);
  });
});
