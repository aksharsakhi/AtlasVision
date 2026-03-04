// ============================================
// Weather Alerts — OpenMeteo API (free, no key)
// Tracks severe weather globally
// ============================================
import { EventBus } from '../utils/event-bus';

interface WeatherAlert {
    lat: number;
    lon: number;
    city: string;
    temp: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    isExtreme: boolean;
}

const MONITORED_CITIES = [
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Mumbai', lat: 19.08, lon: 72.88 },
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'New York', lat: 40.71, lon: -74.01 },
    { name: 'Moscow', lat: 55.76, lon: 37.62 },
    { name: 'Beijing', lat: 39.91, lon: 116.40 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 },
    { name: 'Dubai', lat: 25.20, lon: 55.27 },
    { name: 'São Paulo', lat: -23.55, lon: -46.63 },
    { name: 'Berlin', lat: 52.52, lon: 13.41 },
    { name: 'Singapore', lat: 1.35, lon: 103.82 },
    { name: 'Cairo', lat: 30.04, lon: 31.24 },
];

function getWeatherDescription(code: number): string {
    if (code === 0) return '☀️ Clear';
    if (code <= 3) return '⛅ Partly Cloudy';
    if (code <= 49) return '🌫️ Fog';
    if (code <= 59) return '🌧️ Drizzle';
    if (code <= 69) return '🌧️ Rain';
    if (code <= 79) return '🌨️ Snow';
    if (code <= 84) return '🌧️ Rain Showers';
    if (code <= 86) return '🌨️ Snow Showers';
    if (code <= 99) return '⛈️ Thunderstorm';
    return '❓ Unknown';
}

function isExtremeWeather(code: number, temp: number, wind: number): boolean {
    return code >= 65 || code >= 95 || temp > 45 || temp < -30 || wind > 80;
}

async function fetchWeather(): Promise<WeatherAlert[]> {
    const lats = MONITORED_CITIES.map(c => c.lat).join(',');
    const lons = MONITORED_CITIES.map(c => c.lon).join(',');
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Weather ${r.status}`);
        const data = await r.json();

        // open-meteo returns array for multiple locations
        const results: WeatherAlert[] = [];
        const items = Array.isArray(data) ? data : [data];

        items.forEach((d: any, i: number) => {
            const city = MONITORED_CITIES[i];
            if (!city || !d?.current) return;
            const c = d.current;
            const code = c.weather_code || 0;
            const temp = c.temperature_2m || 0;
            const wind = c.wind_speed_10m || 0;
            results.push({
                lat: city.lat, lon: city.lon, city: city.name,
                temp, windSpeed: wind, weatherCode: code,
                description: getWeatherDescription(code),
                isExtreme: isExtremeWeather(code, temp, wind),
            });
        });

        return results;
    } catch (err) {
        console.warn('Weather fetch failed:', err);
        return [];
    }
}

function renderWeather(alerts: WeatherAlert[]) {
    const container = document.getElementById('weather-list');
    if (!container) return;

    const extreme = alerts.filter(a => a.isExtreme);
    const el = document.getElementById('weather-count');
    if (el) el.textContent = extreme.length > 0 ? `${extreme.length} ⚠️` : `${alerts.length}`;

    container.innerHTML = alerts.map(a => {
        return `
      <div class="weather-item ${a.isExtreme ? 'weather-extreme' : ''}">
        <div class="wi-header">
          <span class="wi-city">${a.city}</span>
          <span class="wi-temp" style="color:${a.temp > 35 ? '#ff5252' : a.temp < 0 ? '#40c4ff' : '#e8e8e8'}">${a.temp.toFixed(0)}°C</span>
        </div>
        <div class="wi-meta">
          <span>${a.description}</span>
          <span>💨 ${a.windSpeed.toFixed(0)} km/h</span>
        </div>
      </div>
    `;
    }).join('');
}

export async function initWeatherPanel() {
    const alerts = await fetchWeather();
    renderWeather(alerts);
    setInterval(async () => renderWeather(await fetchWeather()), 600000);
}
