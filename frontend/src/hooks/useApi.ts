import { useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  statusCode: number | null;
  latencyMs: number | null;
}

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const request = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body: any = null,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> => {
    setLoading(true);
    const start = performance.now();
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && method === 'POST') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      const latencyMs = Math.round(performance.now() - start);
      
      let data = null;
      // Read response body if there's content
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text as any;
        }
      }

      setLoading(false);

      if (!response.ok) {
        return {
          data,
          error: data?.detail || `Request failed with status ${response.status}`,
          statusCode: response.status,
          latencyMs,
        };
      }

      return {
        data: data as T,
        error: null,
        statusCode: response.status,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setLoading(false);
      return {
        data: null,
        error: err.message || 'Network error connection refused',
        statusCode: 0,
        latencyMs,
      };
    }
  };

  return {
    loading,
    request,
  };
};
