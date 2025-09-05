'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface QueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  retry?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface QueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

const queryCache = new Map<string, {
  data: unknown;
  timestamp: number;
  staleTime: number;
}>();

export function useOptimizedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: QueryOptions<T> = {}
): QueryResult<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchInterval,
    retry = 3,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const getCachedData = useCallback(() => {
    const cached = queryCache.get(key);
    if (!cached) return null;

    const isStale = Date.now() - cached.timestamp > cached.staleTime;
    if (isStale) {
      queryCache.delete(key);
      return null;
    }

    return cached.data as T;
  }, [key]);

  const setCachedData = useCallback((newData: T) => {
    queryCache.set(key, {
      data: newData,
      timestamp: Date.now(),
      staleTime
    });
  }, [key, staleTime]);

  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      setCachedData(result);
      setRetryCount(0);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (retryCount < retry) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => executeQuery(), Math.pow(2, retryCount) * 1000);
      } else {
        setError(error);
        onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, getCachedData, queryFn, setCachedData, retryCount, retry, onSuccess, onError]);

  const refetch = useCallback(async () => {
    queryCache.delete(key);
    setRetryCount(0);
    await executeQuery();
  }, [key, executeQuery]);

  const invalidate = useCallback(() => {
    queryCache.delete(key);
    setData(undefined);
  }, [key]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      executeQuery();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, executeQuery]);

  return useMemo(() => ({
    data,
    loading,
    error,
    refetch,
    invalidate
  }), [data, loading, error, refetch, invalidate]);
}

export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  } = {}
) {
  const [data, setData] = useState<TData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      setData(result);
      options.onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error, variables);
      throw error;
    } finally {
      setLoading(false);
      options.onSettled?.(data, error, variables);
    }
  }, [mutationFn, options, data, error]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setLoading(false);
  }, []);

  return useMemo(() => ({
    mutate,
    data,
    loading,
    error,
    reset
  }), [mutate, data, loading, error, reset]);
}

export function clearQueryCache(pattern?: string) {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

export function useInvalidateQueries() {
  return useCallback((pattern: string) => {
    clearQueryCache(pattern);
  }, []);
}