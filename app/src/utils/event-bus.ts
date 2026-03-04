// ============================================
// Event Bus — Global Communication
// ============================================
type EventCallback = (...args: any[]) => void;

export class EventBus {
    private static instance: EventBus;
    private listeners: Map<string, EventCallback[]> = new Map();

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback): void {
        const cbs = this.listeners.get(event);
        if (cbs) {
            this.listeners.set(event, cbs.filter(cb => cb !== callback));
        }
    }

    emit(event: string, ...args: any[]): void {
        const cbs = this.listeners.get(event);
        if (cbs) {
            cbs.forEach(cb => cb(...args));
        }
    }
}
