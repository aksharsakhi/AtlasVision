/**
 * Industrial-Grade HTTP Client
 * Features: Retry logic, caching, timeout handling, error management, telemetry
 */

import { config, API_ENDPOINTS, environment } from '../config';

export interface RequestOptions {
    timeout?: number;
    retries?: number;
    cache?: boolean;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export interface HttpResponse<T = any> {
    data: T;
    status: number;
    headers: Headers;
    cached?: boolean;
}

export class HttpError extends Error {
    constructor(
        message: string,
        public status: number,
        public url: string,
        public retryCount: number = 0
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

// Simple in-memory cache
class CacheManager {
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    set(key: string, data: any, ttl: number): void {
        if (!config.data.cache.enabled) return;

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    get(key: string): any | null {
        if (!config.data.cache.enabled) return null;

        const entry = this.cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

const cache = new CacheManager();

export class HttpClient {
    private baseURL: string;
    private defaultTimeout: number;
    private defaultRetries: number;

    constructor() {
        this.baseURL = config.api.base;
        this.defaultTimeout = config.api.timeout;
        this.defaultRetries = config.api.retryAttempts;
    }

    private generateCacheKey(url: string, options?: RequestOptions): string {
        const params = options?.headers ? JSON.stringify(options.headers) : '';
        return `${url}:${params}`;
    }

    private async fetchWithRetry<T>(
        url: string,
        options: RequestInit & { retries?: number; timeout?: number },
        retryCount: number = 0
    ): Promise<Response> {
        const timeout = options.timeout || this.defaultTimeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Retry on server errors (5xx) or network issues
            if (!response.ok && response.status >= 500 && retryCount < (options.retries || this.defaultRetries)) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                throw new HttpError(`Request timeout after ${timeout}ms`, 408, url, retryCount);
            }

            if (retryCount < (options.retries || this.defaultRetries)) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }

            const errorMessage = error instanceof Error ? error.message : 'Network error';
            throw new HttpError(errorMessage, 0, url, retryCount);
        }
    }

    async get<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
        const cacheKey = this.generateCacheKey(url, options);

        // Check cache first
        if (options.cache !== false && config.data.cache.enabled) {
            const cached = cache.get(cacheKey);
            if (cached) {
                return {
                    data: cached,
                    status: 200,
                    headers: new Headers(),
                    cached: true,
                };
            }
        }

        const response = await this.fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GlobalControl/3.0 (Industrial Grade)',
                ...options.headers,
            },
            timeout: options.timeout,
            retries: options.retries,
        });

        if (!response.ok) {
            throw new HttpError(
                `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                url
            );
        }

        const data = await response.json();

        // Cache successful responses
        if (options.cache !== false && config.data.cache.enabled) {
            cache.set(cacheKey, data, config.data.cache.ttl);
        }

        return {
            data,
            status: response.status,
            headers: response.headers,
        };
    }

    async post<T = any>(url: string, data: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
        const response = await this.fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'GlobalControl/3.0 (Industrial Grade)',
                ...options.headers,
            },
            body: JSON.stringify(data),
            timeout: options.timeout,
            retries: options.retries,
        });

        if (!response.ok) {
            throw new HttpError(
                `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                url
            );
        }

        const responseData = await response.json();

        return {
            data: responseData,
            status: response.status,
            headers: response.headers,
        };
    }

    async put<T = any>(url: string, data: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
        const response = await this.fetchWithRetry(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'GlobalControl/3.0 (Industrial Grade)',
                ...options.headers,
            },
            body: JSON.stringify(data),
            timeout: options.timeout,
            retries: options.retries,
        });

        if (!response.ok) {
            throw new HttpError(
                `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                url
            );
        }

        const responseData = await response.json();

        return {
            data: responseData,
            status: response.status,
            headers: response.headers,
        };
    }

    async delete<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
        const response = await this.fetchWithRetry(url, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GlobalControl/3.0 (Industrial Grade)',
                ...options.headers,
            },
            timeout: options.timeout,
            retries: options.retries,
        });

        if (!response.ok) {
            throw new HttpError(
                `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                url
            );
        }

        const responseData = response.status !== 204 ? await response.json() : null;

        return {
            data: responseData,
            status: response.status,
            headers: response.headers,
        };
    }

    // Convenience methods for common endpoints
    async getFlights(options: RequestOptions = {}): Promise<HttpResponse> {
        return this.get(API_ENDPOINTS.FLIGHTS, options);
    }

    async getSatellites(options: RequestOptions = {}): Promise<HttpResponse> {
        return this.get(API_ENDPOINTS.SATELLITES, options);
    }

    async getEarthquakes(options: RequestOptions = {}): Promise<HttpResponse> {
        return this.get(API_ENDPOINTS.EARTHQUAKES, options);
    }

    async getShips(options: RequestOptions = {}): Promise<HttpResponse> {
        return this.get(API_ENDPOINTS.SHIPS, options);
    }

    async getNews(options: RequestOptions = {}): Promise<HttpResponse> {
        return this.get(API_ENDPOINTS.NEWS, options);
    }

    // Proxy methods for external APIs
    async proxyRSS(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
        const proxyUrl = `${API_ENDPOINTS.RSS_PROXY}?url=${encodeURIComponent(url)}`;
        return this.get(proxyUrl, options);
    }

    async proxyCORS(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
        const proxyUrl = `${API_ENDPOINTS.CORS_PROXY}?url=${encodeURIComponent(url)}`;
        return this.get(proxyUrl, options);
    }

    // Cache management
    clearCache(): void {
        cache.clear();
    }

    getCacheSize(): number {
        return cache.size();
    }
}

// Export singleton instance
export const httpClient = new HttpClient();

// Global error handler for HTTP errors
export function handleHttpError(error: HttpError): void {
    console.error(`[HTTP ERROR] ${error.status} - ${error.message} (Retry: ${error.retryCount})`);

    // In production, you might want to send this to a monitoring service
    if (config.monitoring.enableTelemetry && environment === 'production') {
        // Send telemetry data
        console.log('[TELEMETRY] HTTP error logged');
    }
}