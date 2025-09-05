'use client';

import { useEffect } from 'react';

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return;
    }

    // Core Web Vitals monitoring
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        switch (entry.entryType) {
          case 'largest-contentful-paint':
            console.log('LCP:', entry.startTime);
            break;
          case 'first-input':
            console.log('FID:', entry.processingStart - entry.startTime);
            break;
          case 'layout-shift':
            if (!entry.hadRecentInput) {
              console.log('CLS:', entry.value);
            }
            break;
        }
      });
    });

    // Observe Core Web Vitals
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }

    // Monitor bundle size and loading times
    const logResourceTiming = () => {
      if (performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const jsResources = resources.filter(resource => resource.name.includes('.js'));
        const cssResources = resources.filter(resource => resource.name.includes('.css'));
        
        const totalJSSize = jsResources.reduce((sum, resource) => {
          return sum + (resource.transferSize || 0);
        }, 0);
        
        const totalCSSSize = cssResources.reduce((sum, resource) => {
          return sum + (resource.transferSize || 0);
        }, 0);

        console.log('Performance Summary:', {
          totalJSSize: `${(totalJSSize / 1024).toFixed(2)} KB`,
          totalCSSSize: `${(totalCSSSize / 1024).toFixed(2)} KB`,
          jsFiles: jsResources.length,
          cssFiles: cssResources.length,
          slowResources: resources.filter(r => r.duration > 1000).length
        });
      }
    };

    // Log performance metrics after page load
    setTimeout(logResourceTiming, 3000);

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}

export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function PerformanceWrappedComponent(props: P) {
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        const componentName = Component.displayName || Component.name || 'Anonymous';
        console.time(`${componentName} render`);
        
        return () => {
          console.timeEnd(`${componentName} render`);
        };
      }
    });

    return <Component {...props} />;
  };
}

// Custom hook for measuring component performance
export function usePerformanceMeasure(name: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${name}-start`);
      
      return () => {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name)[0];
        if (measure) {
          console.log(`${name} duration:`, measure.duration.toFixed(2), 'ms');
        }
      };
    }
  }, [name]);
}

// Performance metrics collector
export class PerformanceCollector {
  private static metrics: Array<{
    name: string;
    value: number;
    timestamp: number;
  }> = [];

  static recordMetric(name: string, value: number) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now()
    });

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance Metric - ${name}:`, value);
    }
  }

  static getMetrics() {
    return [...this.metrics];
  }

  static getMetricsByName(name: string) {
    return this.metrics.filter(metric => metric.name === name);
  }

  static clearMetrics() {
    this.metrics = [];
  }

  static getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }
}