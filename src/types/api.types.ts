export interface DataResponse<T> {
  data: T;
  meta?: {
    execution: 'synchronous';
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    stack?: string;
  };
}
