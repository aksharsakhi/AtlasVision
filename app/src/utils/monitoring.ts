/**
 * Industrial-Grade Monitoring & Telemetry System
 * Features: Performance metrics, error tracking, usage analytics, health checks
 */

import { config, environment } from '../config';

export interface Metric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    tags?: Record<string, string>;
}

export interface ErrorReport {
    id: string;
    message: string;
    stack?: string;
    timestamp: number;
    level: 'error' | 'warn' | 'info';
    context?: Record<string, any>;
    userAgent: string;
    url: string;
}

export interface PerformanceMetric {
    name: string;
    duration: number;
    startTime: number;
    endTime: number;
    tags?: Record<string, string>;
}

export interface HealthCheck {
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    timestamp: number;
    duration?: number;
}

class MonitoringSystem {
    private metrics: Metric[] = [];
    private errors: ErrorReport[] = [];
    private performance: PerformanceMetric[] = [];
    private healthChecks: HealthCheck[] = [];
    private startTime: number = Date.now();

    constructor() {
        this.setupGlobalErrorHandlers();
        this.startPeriodicHealthChecks();
    }

    // Performance monitoring
    startTimer(name: string, tags?: Record<string, string>): string {
        const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timer = {
            name,
            startTime: performance.now(),
            endTime: 0,
            duration: 0,
            tags,
        };

        // Store timer in session storage for retrieval
        sessionStorage.setItem(`timer_${id}`, JSON.stringify(timer));
        return id;
    }

    endTimer(id: string): PerformanceMetric | null {
        const timerData = sessionStorage.getItem(`timer_${id}`);
        if (!timerData) return null;

        const timer = JSON.parse(timerData);
        timer.endTime = performance.now();
        timer.duration = timer.endTime - timer.startTime;

        const metric: PerformanceMetric = {
            name: timer.name,
            duration: timer.duration,
            startTime: timer.startTime,
            endTime: timer.endTime,
            tags: timer.tags,
        };

        this.performance.push(metric);
        sessionStorage.removeItem(`timer_${id}`);

        // Log to console in development
        if (config.monitoring.enableLogging) {
            console.log(`[PERF] ${metric.name}: ${metric.duration.toFixed(2)}ms`);
        }

        return metric;
    }

    // Error tracking
    reportError(
        error: Error | string,
        level: 'error' | 'warn' | 'info' = 'error',
        context?: Record<string, any>
    ): void {
        const errorReport: ErrorReport = {
            id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: typeof error === 'string' ? error : error.message,
            stack: typeof error === 'object' ? error.stack : undefined,
            timestamp: Date.now(),
            level,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
        };

        this.errors.push(errorReport);

        // Log to console in development
        if (config.monitoring.enableLogging) {
            console[level](`[ERROR ${level.toUpperCase()}] ${errorReport.message}`, context);
        }

        // Send to telemetry service in production
        if (config.monitoring.enableTelemetry && environment === 'production') {
            this.sendTelemetry('error', errorReport);
        }
    }

    // Custom metrics
    recordMetric(
        name: string,
        value: number,
        unit: string = 'count',
        tags?: Record<string, string>
    ): void {
        const metric: Metric = {
            name,
            value,
            unit,
            timestamp: Date.now(),
            tags,
        };

        this.metrics.push(metric);

        // Keep only last 1000 metrics
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }

        // Log to console in development
        if (config.monitoring.enableLogging) {
            console.log(`[METRIC] ${name}: ${value}${unit}`);
        }

        // Send to telemetry service in production
        if (config.monitoring.enableTelemetry && environment === 'production') {
            this.sendTelemetry('metric', metric);
        }
    }

    // Health checks
    async runHealthCheck(name: string, checkFn: () => Promise<boolean | string>): Promise<HealthCheck> {
        const startTime = performance.now();
        const timestamp = Date.now();

        try {
            const result = await checkFn();
            const duration = performance.now() - startTime;

            const healthCheck: HealthCheck = {
                name,
                status: result === true ? 'healthy' : result === false ? 'unhealthy' : 'degraded',
                message: typeof result === 'string' ? result : undefined,
                timestamp,
                duration,
            };

            this.healthChecks.push(healthCheck);

            // Keep only last 100 health checks
            if (this.healthChecks.length > 100) {
                this.healthChecks = this.healthChecks.slice(-100);
            }

            return healthCheck;
        } catch (error) {
            const duration = performance.now() - startTime;

            const healthCheck: HealthCheck = {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Health check failed',
                timestamp,
                duration,
            };

            this.healthChecks.push(healthCheck);
            this.reportError(error as Error, 'error', { healthCheck: name });

            return healthCheck;
        }
    }

    // System health summary
    getHealthSummary(): {
        overall: 'healthy' | 'degraded' | 'unhealthy';
        uptime: number;
        metricsCount: number;
        errorsCount: number;
        performanceCount: number;
        recentErrors: ErrorReport[];
        recentHealthChecks: HealthCheck[];
    } {
        const now = Date.now();
        const recentErrors = this.errors.filter(e => now - e.timestamp < 300000); // Last 5 minutes
        const recentHealthChecks = this.healthChecks.slice(-10);

        let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        // Check for critical errors
        if (recentErrors.some(e => e.level === 'error')) {
            overall = 'unhealthy';
        } else if (recentErrors.length > 0) {
            overall = 'degraded';
        }

        // Check health checks
        const unhealthyChecks = recentHealthChecks.filter(h => h.status === 'unhealthy');
        if (unhealthyChecks.length > 0) {
            overall = 'unhealthy';
        } else if (recentHealthChecks.some(h => h.status === 'degraded')) {
            overall = 'degraded';
        }

        return {
            overall,
            uptime: now - this.startTime,
            metricsCount: this.metrics.length,
            errorsCount: this.errors.length,
            performanceCount: this.performance.length,
            recentErrors,
            recentHealthChecks,
        };
    }

    // Performance analytics
    getPerformanceAnalytics(): {
        avgLoadTime: number;
        slowestOperations: PerformanceMetric[];
        operationCounts: Record<string, number>;
    } {
        const avgLoadTime = this.performance.length > 0
            ? this.performance.reduce((sum, p) => sum + p.duration, 0) / this.performance.length
            : 0;

        const slowestOperations = this.performance
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);

        const operationCounts: Record<string, number> = {};
        this.performance.forEach(p => {
            operationCounts[p.name] = (operationCounts[p.name] || 0) + 1;
        });

        return {
            avgLoadTime,
            slowestOperations,
            operationCounts,
        };
    }

    // Memory usage monitoring
    getMemoryUsage(): {
        used: number;
        total: number;
        percentage: number;
    } | null {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
            };
        }
        return null;
    }

    // Network monitoring
    recordNetworkRequest(url: string, method: string, duration: number, status: number): void {
        this.recordMetric(`network_${method.toLowerCase()}_${status}`, duration, 'ms', {
            url,
            method,
            status: status.toString(),
        });
    }

    // User interaction tracking
    recordUserAction(action: string, details?: Record<string, any>): void {
        this.recordMetric(`user_action_${action}`, 1, 'count', details);
    }

    // Setup global error handlers
    private setupGlobalErrorHandlers(): void {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.reportError(event.reason, 'error', { type: 'unhandled_promise_rejection' });
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            this.reportError(event.error || event.message, 'error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            });
        });
    }

    // Periodic health checks
    private startPeriodicHealthChecks(): void {
        if (!config.monitoring.enableMetrics) return;

        setInterval(async () => {
            // Check memory usage
            const memory = this.getMemoryUsage();
            if (memory) {
                this.recordMetric('memory_usage', memory.percentage, 'percent', {
                    used: memory.used.toString(),
                    total: memory.total.toString(),
                });
            }

            // Check network connectivity
            await this.runHealthCheck('network_connectivity', async () => {
                try {
                    const response = await fetch('/api/health', { method: 'HEAD' });
                    return response.ok;
                } catch {
                    return false;
                }
            });

            // Check API responsiveness
            await this.runHealthCheck('api_responsiveness', async () => {
                const start = performance.now();
                try {
                    const response = await fetch('/api/health');
                    const duration = performance.now() - start;
                    return duration < 2000; // API should respond within 2 seconds
                } catch {
                    return false;
                }
            });

        }, 60000); // Run every minute
    }

    // Telemetry sending (placeholder for actual implementation)
    private async sendTelemetry(type: string, data: any): Promise<void> {
        try {
            // In a real implementation, this would send to a telemetry service
            // For now, we'll just log it
            if (config.monitoring.enableLogging) {
                console.log(`[TELEMETRY] ${type}:`, data);
            }
        } catch (error) {
            this.reportError(error as Error, 'warn', { telemetryType: type });
        }
    }

    // Cleanup
    cleanup(): void {
        this.metrics = [];
        this.errors = [];
        this.performance = [];
        this.healthChecks = [];
    }
}

// Export singleton instance
export const monitoring = new MonitoringSystem();

// Convenience functions
export const startTimer = (name: string, tags?: Record<string, string>): string =>
    monitoring.startTimer(name, tags);

export const endTimer = (id: string): PerformanceMetric | null =>
    monitoring.endTimer(id);

export const reportError = (error: Error | string, level?: 'error' | 'warn' | 'info', context?: Record<string, any>): void =>
    monitoring.reportError(error, level, context);

export const recordMetric = (name: string, value: number, unit?: string, tags?: Record<string, string>): void =>
    monitoring.recordMetric(name, value, unit, tags);

export const recordUserAction = (action: string, details?: Record<string, any>): void =>
    monitoring.recordUserAction(action, details);

export const getHealthSummary = () => monitoring.getHealthSummary();
export const getPerformanceAnalytics = () => monitoring.getPerformanceAnalytics();
export const getMemoryUsage = () => monitoring.getMemoryUsage();
