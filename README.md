# 🌍 AtlasVision

> **Real-Time Global Intelligence & Space Tracking Platform**

AtlasVision is a decentralized intelligence aggregation dashboard for real-time situational awareness — combining live flight tracking, satellite orbit predictions, global conflict maps, cyber threat intelligence, health surveillance, and financial markets in one unified interface.

![AtlasVision](https://img.shields.io/badge/version-4.0-00d4ff?style=flat-square) ![stack](https://img.shields.io/badge/stack-TypeScript%20%7C%20Vite%20%7C%20Leaflet%20%7C%20CesiumJS-7b61ff?style=flat-square)

---

## ✈️ Features

| Dashboard | What it does |
|---|---|
| **Main** | Unified world map with flights, ships, satellites, earthquakes, ISS tracker |
| **Flights** | ADS-B transponder tracking — up to 14,000+ live aircraft worldwide |
| **Space & Satellites** | SGP4 orbital propagation, ISS, Starlink, debris tracking |
| **War** | Conflict zones, troop deployments, missile intercepts, panoptic detection |
| **Cyber & Intel** | APT actor mapping, CVE feed, live SIGINT intercepts, cyber news |
| **Health** | WHO outbreak surveillance, vaccination coverage, AMR resistance |
| **Finance** | Live stocks, crypto, FOREX via TradingView |
| **3D Globe** | CesiumJS planetary rendering — toggle overlay on any dashboard |

---

## 🚀 Quick Start

```bash
git clone https://github.com/aksharsakhi/AtlasVision.git
cd AtlasVision/app

# One command to start everything:
./run.sh
```

Then open [http://localhost:5173](http://localhost:5173)

### Manual Start

```bash
cd app
npm install
npm run dev
```

---

## 🛠️ Tech Stack

- **Frontend**: TypeScript, Vite, Leaflet.js (2D maps), CesiumJS (3D globe)
- **Backend**: Node.js + Express (CORS proxy, ADS-B aggregator, RSS feeds)
- **Flight Data**: ADS-B Exchange (`adsb.lol`), Flightradar24, OpenSky Network
- **Satellite Data**: CelesTrak TLEs + `satellite.js` SGP4 propagation
- **Finance**: TradingView widgets
- **Styling**: Pure CSS (no framework)

---

## 📡 Data Sources

| Data | Source |
|---|---|
| Live Flights | ADS-B Exchange, FR24, OpenSky |
| Satellites | CelesTrak (NORAD TLEs) |
| Earthquakes | USGS Real-time Feed |
| Health | WHO, CDC, ProMED |
| Cyber Threats | NVD CVE, SIGINT simulation |
| Maps | CartoDB, ESRI World Imagery |
| Finance | TradingView |

---

## 📁 Project Structure

```
AtlasVision/
├── app/
│   ├── server/          # Express API proxy server
│   ├── src/
│   │   ├── panels/      # Dashboard panels (flights, war, health, cyber...)
│   │   ├── layers/      # Map data layers
│   │   ├── engines/     # Correlation, escalation, query engines
│   │   ├── globe/       # CesiumJS 3D globe
│   │   └── utils/       # Shared utilities
│   ├── index.html
│   └── run.sh           # One-command startup
└── README.md
```

---

*AtlasVision — Decentralized Intelligence Platform. Build Rev 4.0*
