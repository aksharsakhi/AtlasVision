# AtlasVision

AtlasVision (formerly GlobalControl) is a decentralized real-time intelligence aggregator and orbital tracking dashboard built for situational awareness.

## Highlights
- **Live Aviation Tracking**: Global transponder decoding using `adsb.lol`, `Flightradar24`, and `OpenSky`.
- **Space & Satellites**: Live tracking and orbit prediction of thousands of satellites utilizing SGP4 logic.
- **Strategic Threat Maps**: War and active conflict deployment metrics rendering mapped battlefields and missile intercepts globally.
- **Public & Cyber Intelligence**: Panoptic anomaly tracking and active intrusions reporting on SIGINT networks.
- **3D Planetary Rendering**: Dynamic injection of full CesiumJS globe environments superimposed immediately over your current 2D tactical Map.

### Core Stack
- **Frontend Engine**: Vite, TypeScript, Leaflet.js (2D), CesiumJS (3D)
- **Backend Edge**: Node.js & Express.js
- **Styling**: Pure CSS layout matrices without heavy UI frameworks perfectly tuned for high data-density tracking

## Starting the Application
A fast-start script has been provided at the root:

```bash
chmod +x run.sh
./run.sh
```

Alternatively, you may launch via standard NPM scripts:

```bash
npm install
npm run dev
```

The application will bind to port 5173. Proceed to `http://localhost:5173`.
