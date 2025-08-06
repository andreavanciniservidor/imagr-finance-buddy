/**
 * Performance Monitor - Simple utility for tracking performance metrics
 * Used to monitor calculation times and identify performance bottlenecks
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static maxMetrics = 100; // Keep only last 100 metrics
  private static isEnabled = process.env.NODE_ENV === 'development';

  /**
   * Start timing a performance metric
   */
  static startTiming(name: string): () => void {
    if (!this.isEnabled) {
      return () => {}; // No-op in production
    }

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now()
      });
      
      // Log slow operations (> 10ms)
      if (duration > 10) {
        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  /**
   * Time a function execution
   */
  static timeFunction<T>(name: string, fn: () => T): T {
    if (!this.isEnabled) {
      return fn();
    }

    const endTiming = this.startTiming(name);
    try {
      const result = fn();
      endTiming();
      return result;
    } catch (error) {
      endTiming();
      throw error;
    }
  }

  /**
   * Time an async function execution
   */
  static async timeAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) {
      return fn();
    }

    const endTiming = this.startTiming(name);
    try {
      const result = await fn();
      endTiming();
      return result;
    } catch (error) {
      endTiming();
      throw error;
    }
  }

  /**
   * Add a performance metric
   */
  private static addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics for a specific operation
   */
  static getStats(name: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
  } | null {
    if (!this.isEnabled) {
      return null;
    }

    const relevantMetrics = this.metrics.filter(m => m.name === name);
    
    if (relevantMetrics.length === 0) {
      return null;
    }

    const durations = relevantMetrics.map(m => m.duration);
    
    return {
      count: relevantMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: durations.reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Get all performance metrics
   */
  static getAllMetrics(): PerformanceMetric[] {
    return this.isEnabled ? [...this.metrics] : [];
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Log performance summary to console
   */
  static logSummary(): void {
    if (!this.isEnabled) {
      return;
    }

    const uniqueNames = [...new Set(this.metrics.map(m => m.name))];
    
    console.group('Performance Summary');
    uniqueNames.forEach(name => {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`${name}:`, {
          calls: stats.count,
          avg: `${stats.avgDuration.toFixed(2)}ms`,
          min: `${stats.minDuration.toFixed(2)}ms`,
          max: `${stats.maxDuration.toFixed(2)}ms`,
          total: `${stats.totalDuration.toFixed(2)}ms`
        });
      }
    });
    console.groupEnd();
  }

  /**
   * Enable or disable performance monitoring
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if performance monitoring is enabled
   */
  static isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }
}

export default PerformanceMonitor;