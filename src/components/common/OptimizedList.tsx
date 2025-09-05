'use client';

import React, { memo, useRef, useState, useCallback } from 'react';
import { useVirtualization } from '@/hooks/useVirtualization';

interface OptimizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  loadMore?: () => void;
  hasNextPage?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
}

function OptimizedListComponent<T>({
  items,
  itemHeight,
  containerHeight = 400,
  renderItem,
  keyExtractor,
  loadMore,
  hasNextPage = false,
  loading = false,
  error = null,
  emptyMessage = 'No items found',
  className = ''
}: OptimizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { virtualItems, totalHeight, scrollToIndex } = useVirtualization(items, {
    itemHeight,
    containerHeight,
    scrollElement: containerRef.current || undefined
  });

  const handleScroll = useCallback(async (e: React.UIEvent<HTMLDivElement>) => {
    if (!loadMore || !hasNextPage || loadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8) {
      setLoadingMore(true);
      try {
        await loadMore();
      } finally {
        setLoadingMore(false);
      }
    }
  }, [loadMore, hasNextPage, loadingMore]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-red-600 bg-red-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm font-medium">Error loading items</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 bg-gray-50 rounded-lg">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-auto ${className}`}
      style={{ height: containerHeight }}
      ref={containerRef}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ index, start, item }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              top: start,
              left: 0,
              right: 0,
              height: itemHeight
            }}
            className="px-2"
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {(loading || loadingMore) && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center py-2 bg-white bg-opacity-80">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>{loading ? 'Loading...' : 'Loading more...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const OptimizedList = memo(OptimizedListComponent) as <T>(
  props: OptimizedListProps<T>
) => JSX.Element;

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo<LazyImageProps>(({
  src,
  alt,
  className = '',
  placeholder = '/placeholder.png',
  onLoad,
  onError
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  return (
    <div className={`relative ${className}`}>
      <img
        ref={imgRef}
        src={error ? placeholder : src}
        alt={alt}
        className={`transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

interface MemoizedCardProps {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MemoizedCard = memo<MemoizedCardProps>(({
  title,
  subtitle,
  content,
  actions,
  onClick,
  className = ''
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0 ml-2">
              {actions}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {content}
        </div>
      </div>
    </div>
  );
});

MemoizedCard.displayName = 'MemoizedCard';

interface OptimizedTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    title: string;
    render?: (value: T[keyof T], item: T, index: number) => React.ReactNode;
    sortable?: boolean;
    width?: string;
  }>;
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T, index: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const OptimizedTable = memo(<T,>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: OptimizedTableProps<T>) => {
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: keyof T) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  const sortedData = React.useMemo(() => {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-2"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded mb-1"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{ width: column.width }}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.title}</span>
                  {column.sortable && sortBy === column.key && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item, index) => (
            <tr
              key={keyExtractor(item, index)}
              className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={onRowClick ? () => onRowClick(item, index) : undefined}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-3 text-sm">
                  {column.render
                    ? column.render(item[column.key], item, index)
                    : String(item[column.key] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}) as <T>(props: OptimizedTableProps<T>) => JSX.Element;