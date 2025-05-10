class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }
  
  start(label) {
    this.metrics.set(label, {
      start: performance.now(),
      end: null,
      duration: null
    });
  }
  
  end(label) {
    const metric = this.metrics.get(label);
    if (metric) {
      metric.end = performance.now();
      metric.duration = metric.end - metric.start;
      
      // Log slow operations
      if (metric.duration > 1000) {
        console.warn(`Slow operation detected: ${label} took ${metric.duration.toFixed(2)}ms`);
      }
      
      return metric.duration;
    }
    return null;
  }
  
  getMetrics() {
    return Array.from(this.metrics.entries()).map(([label, metric]) => ({
      label,
      duration: metric.duration
    }));
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Use in your components
// performanceMonitor.start('search');
// await searchCars(params);
// performanceMonitor.end('search');