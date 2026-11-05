import type { ErrorRequestHandler } from 'express';
import type { ErrorResponse } from '../types/api.types';

const errorHandler: ErrorRequestHandler<Record<string, string>, ErrorResponse> = (err: unknown, req, res, next) => {
  const error = err instanceof Error ? err : new Error('Internal Server Error');
  const status = 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500;
  const payload: ErrorResponse = {
    error: {
      message: error.message || 'Internal Server Error'
    }
  };

  if (process.env.NODE_ENV !== 'production' && error.stack) {
    payload.error.stack = error.stack;
  }

  res.status(status).json(payload);
};

export default errorHandler;
