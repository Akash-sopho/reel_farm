class ApiError extends Error {
    constructor(statusCode, code, message) {
        super(message);
        Object.defineProperty(this, "statusCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: statusCode
        });
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: code
        });
        this.name = 'ApiError';
    }
}
async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    if (!response.ok) {
        let errorData;
        try {
            errorData = isJson ? await response.json() : { error: response.statusText, code: 'HTTP_ERROR', details: {} };
        }
        catch {
            errorData = { error: response.statusText, code: 'HTTP_ERROR', details: {} };
        }
        throw new ApiError(response.status, errorData.code, errorData.error);
    }
    if (!isJson) {
        return undefined;
    }
    return response.json();
}
async function request(path, options = {}) {
    const url = `/api${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    const response = await fetch(url, {
        ...options,
        headers,
    });
    return handleResponse(response);
}
export const api = {
    get(path) {
        return request(path, { method: 'GET' });
    },
    post(path, body) {
        return request(path, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    },
    patch(path, body) {
        return request(path, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    },
    delete(path) {
        return request(path, { method: 'DELETE' });
    },
};
export { ApiError };
