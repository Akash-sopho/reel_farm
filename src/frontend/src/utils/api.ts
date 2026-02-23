interface ApiErrorResponse {
  error: string;
  code: string;
  details: unknown;
}

class ApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = isJson ? await response.json() : { error: response.statusText, code: 'HTTP_ERROR', details: {} };
    } catch {
      errorData = { error: response.statusText, code: 'HTTP_ERROR', details: {} };
    }
    throw new ApiError(response.status, errorData.code, errorData.error);
  }

  if (!isJson) {
    return undefined as T;
  }

  return response.json();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return handleResponse<T>(response);
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};

export { ApiError };
