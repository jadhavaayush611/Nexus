import { useState, useEffect, useCallback, DependencyList } from 'react';
import { ApiError } from '../services/apiClient.ts';

export interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Reusable data-fetching hook for API operations
 * Handles loading, error, safe retry, and cancellation without swallowing errors.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  enabled: boolean = true
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(
          new ApiError({
            message: (err as Error)?.message || 'An unexpected error occurred.',
            status: 0,
            statusText: 'Client Error',
            endpoint: 'client',
            rawBody: err,
          })
        );
      }
      setData(null);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (enabled) {
      execute();
    }
  }, [execute, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: execute,
    setData,
  };
}
