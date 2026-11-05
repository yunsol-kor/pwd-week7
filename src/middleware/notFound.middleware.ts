import type { RequestHandler } from 'express';
import type { ErrorResponse } from '../types/api.types';

const notFound: RequestHandler<Record<string, string>, ErrorResponse> = (req, res) => {
  res.status(404).json({ error: { message: 'Resource not found' } });
};

export default notFound;
