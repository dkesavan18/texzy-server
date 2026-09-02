import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  function runFilter(exception: unknown) {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));

    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => ({ status, json }),
      }),
    } as never);

    return { status, json };
  }

  it('returns wrapped error without statusCode in body', () => {
    const { status, json } = runFilter(
      new UnauthorizedException('Invalid admin credentials'),
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid admin credentials',
      data: null,
    });

    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body).not.toHaveProperty('statusCode');
  });

  it('maps validation errors to error array', () => {
    const { status, json } = runFilter(
      new BadRequestException({
        statusCode: 400,
        message: ['email must be an email', 'password is too short'],
        error: 'Bad Request',
      }),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: ['email must be an email', 'password is too short'],
      data: null,
    });
  });
});
