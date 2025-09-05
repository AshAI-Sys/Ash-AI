'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

export interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollElement?: HTMLElement;
}

export interface VirtualizationResult<T> {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
    item: T;
  }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  scrollToIndex: (index: number) => void;
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
): VirtualizationResult<T> {
  const { itemHeight, containerHeight, overscan = 5, scrollElement } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  
  const startIndex = useMemo(() => {
    return Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  }, [scrollTop, itemHeight, overscan]);

  const endIndex = useMemo(() => {
    return Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);
  }, [startIndex, visibleCount, overscan, items.length]);

  const virtualItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight,
        item: items[i]
      });
    }
    return result;
  }, [startIndex, endIndex, itemHeight, items]);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollElement) return;
    
    const targetScrollTop = index * itemHeight;
    scrollElement.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [scrollElement, itemHeight]);

  useEffect(() => {
    const element = scrollElement || window;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const newScrollTop = scrollElement 
        ? scrollElement.scrollTop 
        : window.scrollY;
      
      setScrollTop(newScrollTop);
      setIsScrolling(true);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [scrollElement]);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollToIndex
  };
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const [lastRun, setLastRun] = useState(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun >= delay) {
        callback(...args);
        setLastRun(Date.now());
      }
    }) as T,
    [callback, delay, lastRun]
  );
}

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setEntry(entry);
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options.root, options.rootMargin, options.threshold]);

  return { isIntersecting, entry };
}

export function useImagePreloader(src: string) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    
    img.onload = () => {
      setLoaded(true);
      setError(false);
    };
    
    img.onerror = () => {
      setError(true);
      setLoaded(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { loaded, error };
}

export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  dependencies: React.DependencyList
): T {
  return useCallback(callback, dependencies);
}

export function useOptimizedState<T>(
  initialValue: T,
  compareFn?: (prev: T, next: T) => boolean
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue);

  const optimizedSetState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextValue = typeof value === 'function' ? (value as Function)(prev) : value;
      
      if (compareFn) {
        return compareFn(prev, nextValue) ? prev : nextValue;
      }
      
      return Object.is(prev, nextValue) ? prev : nextValue;
    });
  }, [compareFn]);

  return [state, optimizedSetState];
}