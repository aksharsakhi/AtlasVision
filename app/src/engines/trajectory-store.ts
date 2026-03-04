// ============================================
// Trajectory Store — Last 48h of movement data
// Used for Predictive Movement Engine
// ============================================

export interface TrajectoryPoint {
    lat: number;
    lon: number;
    alt?: number;
    timestamp: number;
    velocity?: number;
    heading?: number;
}

export interface TrackedEntity {
    id: string;
    type: 'flight' | 'satellite' | 'ship';
    name: string;
    trajectory: TrajectoryPoint[];
    lastSeen: number;
}

const MAX_HISTORY_MS = 48 * 60 * 60 * 1000; // 48 hours
const MAX_POINTS_PER_ENTITY = 200;

class TrajectoryStoreClass {
    private entities: Map<string, TrackedEntity> = new Map();

    addPoint(id: string, type: TrackedEntity['type'], name: string, point: TrajectoryPoint) {
        let entity = this.entities.get(id);
        if (!entity) {
            entity = { id, type, name, trajectory: [], lastSeen: point.timestamp };
            this.entities.set(id, entity);
        }

        entity.trajectory.push(point);
        entity.lastSeen = point.timestamp;
        entity.name = name;

        // Trim old points
        const cutoff = Date.now() - MAX_HISTORY_MS;
        entity.trajectory = entity.trajectory.filter(p => p.timestamp > cutoff);

        // Cap array size
        if (entity.trajectory.length > MAX_POINTS_PER_ENTITY) {
            entity.trajectory = entity.trajectory.slice(-MAX_POINTS_PER_ENTITY);
        }
    }

    getEntity(id: string): TrackedEntity | undefined {
        return this.entities.get(id);
    }

    getAllEntities(): TrackedEntity[] {
        return Array.from(this.entities.values());
    }

    getEntitiesByType(type: TrackedEntity['type']): TrackedEntity[] {
        return this.getAllEntities().filter(e => e.type === type);
    }

    getEntitiesNear(lat: number, lon: number, radiusKm: number): TrackedEntity[] {
        return this.getAllEntities().filter(e => {
            if (e.trajectory.length === 0) return false;
            const last = e.trajectory[e.trajectory.length - 1];
            return haversine(lat, lon, last.lat, last.lon) <= radiusKm;
        });
    }

    // Prune entities not seen in 48 hours
    prune() {
        const cutoff = Date.now() - MAX_HISTORY_MS;
        this.entities.forEach((entity, id) => {
            if (entity.lastSeen < cutoff) {
                this.entities.delete(id);
            }
        });
    }

    get size(): number {
        return this.entities.size;
    }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const TrajectoryStore = new TrajectoryStoreClass();
