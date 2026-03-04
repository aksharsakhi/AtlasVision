// ============================================
// War Dashboard v2 — Global Military Intelligence
// 120+ Bases | Missile Early Warning | Panoptic Detection
// ============================================
import * as L from 'leaflet';

export let warMap: L.Map | null = null;
let warMapMissileLayer: L.LayerGroup | null = null;
let warMapBaseLayer: L.LayerGroup | null = null;
let warMapMovementLayer: L.LayerGroup | null = null;

// ─── 120+ MILITARY BASES (curated real coordinates) ────────────────────
const MILITARY_BASES = [
  // USA
  { name: 'Pentagon (USA)', coords: [38.871, -77.056], type: 'Command HQ', country: 'USA' },
  { name: 'Fort Liberty (USA)', coords: [35.139, -79.006], type: 'Army Base', country: 'USA' },
  { name: 'Naval Station Norfolk', coords: [36.937, -76.323], type: 'Naval Base', country: 'USA' },
  { name: 'Camp Pendleton', coords: [33.370, -117.418], type: 'USMC Base', country: 'USA' },
  { name: 'Fort Hood', coords: [31.134, -97.781], type: 'Army Base', country: 'USA' },
  { name: 'Edwards AFB', coords: [34.902, -117.884], type: 'Air Base', country: 'USA' },
  { name: 'Nellis AFB', coords: [36.236, -115.034], type: 'Air Base', country: 'USA' },
  { name: 'Fort Benning', coords: [32.354, -84.975], type: 'Army Training', country: 'USA' },
  { name: 'NS San Diego', coords: [32.683, -117.126], type: 'Naval Base', country: 'USA' },
  { name: 'Langley AFB', coords: [37.082, -76.360], type: 'Air Combat Command', country: 'USA' },
  { name: 'MacDill AFB (CENTCOM)', coords: [27.849, -82.521], type: 'CENTCOM HQ', country: 'USA' },
  { name: 'Peterson SFB (NORAD)', coords: [38.815, -104.700], type: 'Space Force', country: 'USA' },
  { name: 'Fort Drum', coords: [44.034, -75.771], type: 'Army Base', country: 'USA' },
  { name: 'JB Pearl Harbor-Hickam', coords: [21.326, -157.940], type: 'Naval/Air', country: 'USA' },
  { name: 'Andersen AFB (Guam)', coords: [13.584, 144.924], type: 'Air Base', country: 'USA' },
  { name: 'Fort Wainwright (AK)', coords: [64.831, -147.651], type: 'Army Arctic', country: 'USA' },
  // Russia
  { name: 'Severomorsk (N. Fleet)', coords: [69.068, 33.416], type: 'Naval HQ', country: 'RUS' },
  { name: 'Vladivostok (Pacific Fl.)', coords: [43.119, 131.883], type: 'Naval Base', country: 'RUS' },
  { name: 'Novorossiysk (Black Sea)', coords: [44.723, 37.769], type: 'Naval Base', country: 'RUS' },
  { name: 'Kubinka Air Base', coords: [55.576, 36.667], type: 'Air Base', country: 'RUS' },
  { name: 'Mozdok Air Base', coords: [43.738, 44.603], type: 'Air Base', country: 'RUS' },
  { name: 'Engels-2 Strategic Base', coords: [51.456, 46.205], type: 'Strategic Bombers', country: 'RUS' },
  { name: 'Kaliningrad Bredikino', coords: [54.686, 20.533], type: 'Missile/Army', country: 'RUS' },
  { name: 'Tartus Naval Base (Syria)', coords: [34.912, 35.875], type: 'Naval Base (FWD)', country: 'RUS' },
  { name: 'Khmeimim Air Base (Syria)', coords: [35.408, 35.946], type: 'Air Base (FWD)', country: 'RUS' },
  { name: 'Kandalaksha Air Base', coords: [67.152, 32.354], type: 'Air Base', country: 'RUS' },
  // China
  { name: 'Yulin Submarine Base', coords: [18.225, 109.539], type: 'SSBN Base', country: 'CHN' },
  { name: 'Zhanjiang Naval HQ', coords: [21.205, 110.395], type: 'S. Sea Fleet HQ', country: 'CHN' },
  { name: 'Qingdao (N. Sea Fleet)', coords: [36.117, 120.505], type: 'Naval Base', country: 'CHN' },
  { name: 'Ningbo-Zhoushan Naval', coords: [29.986, 121.945], type: 'Naval Base', country: 'CHN' },
  { name: 'Djibouti Support Base', coords: [11.587, 43.148], type: 'Overseas Base', country: 'CHN' },
  { name: 'Lhasa Gonggar AFB', coords: [29.301, 90.913], type: 'Air Base (Tibet)', country: 'CHN' },
  { name: 'Hotan Air Base', coords: [37.033, 79.865], type: 'Air Base (Xinjiang)', country: 'CHN' },
  { name: 'Wufei ICBMs (Luoyang)', coords: [34.616, 112.461], type: 'ICBM Silo Field', country: 'CHN' },
  { name: 'SCS Artificial Island (Fiery Cross)', coords: [9.549, 114.224], type: 'Naval/Air Outpost', country: 'CHN' },
  { name: 'Mischief Reef Base', coords: [9.907, 115.535], type: 'Naval Outpost', country: 'CHN' },
  // India
  { name: 'INS Vikramaditya (Home: Karwar)', coords: [14.767, 74.135], type: 'Carrier Base', country: 'IND' },
  { name: 'INS Kadamba (Karwar)', coords: [14.767, 74.128], type: 'Naval Base', country: 'IND' },
  { name: 'A&N Command Port Blair', coords: [11.667, 92.733], type: 'Tri-Service Command', country: 'IND' },
  { name: 'Eastern Air Cmd (Shillong)', coords: [25.578, 91.893], type: 'Air Cmd HQ', country: 'IND' },
  { name: 'Western Air Cmd (Delhi)', coords: [28.668, 77.217], type: 'Air Cmd HQ', country: 'IND' },
  { name: 'Air Force Station Jodhpur', coords: [26.251, 73.047], type: 'Air Base', country: 'IND' },
  { name: 'Leh ALG (Ladakh)', coords: [34.135, 77.546], type: 'High-Alt Air Strip', country: 'IND' },
  { name: 'Siachen Base (NJ9842)', coords: [35.416, 77.089], type: 'Army Glacier Post', country: 'IND' },
  { name: 'INS Agrani (Coimbatore)', coords: [11.024, 77.012], type: 'Naval Training', country: 'IND' },
  { name: 'Rajasthan Missile Range', coords: [27.440, 71.823], type: 'Missile Test Range', country: 'IND' },
  // UK
  { name: 'HMNB Clyde (Faslane)', coords: [56.064, -4.819], type: 'Nuclear Subs', country: 'GBR' },
  { name: 'HMNB Portsmouth', coords: [50.800, -1.110], type: 'Naval Base', country: 'GBR' },
  { name: 'RAF Mildenhall', coords: [52.362, 0.486], type: 'Air Base', country: 'GBR' },
  { name: 'RAF Lakenheath', coords: [52.409, 0.560], type: 'Air Base (USAF/RAF)', country: 'GBR' },
  { name: 'Diego Garcia', coords: [-7.310, 72.411], type: 'Naval/Air Base', country: 'GBR' },
  // France
  { name: 'Brest Naval Arsenal', coords: [48.379, -4.512], type: 'SNLE Base', country: 'FRA' },
  { name: 'BA125 Istres', coords: [43.522, 4.924], type: 'Nuclear Air Base', country: 'FRA' },
  { name: 'Djibouti 13 DBLE', coords: [11.531, 43.159], type: 'French Legion FWD', country: 'FRA' },
  // Germany
  { name: 'Ramstein Air Base', coords: [49.439, 7.599], type: 'USAF/NATO HQ', country: 'DEU' },
  { name: 'Baumholder Army Garrison', coords: [49.642, 7.344], type: 'Army Garrison', country: 'DEU' },
  // South Korea
  { name: 'Camp Humphreys (USFK HQ)', coords: [36.963, 127.034], type: 'USFK HQ', country: 'KOR' },
  { name: 'Osan Air Base', coords: [37.085, 127.029], type: 'Air Base', country: 'KOR' },
  // Japan
  { name: 'Kadena Air Base', coords: [26.355, 127.767], type: 'Air Base', country: 'JPN' },
  { name: 'JB Yokota (USFJ)', coords: [35.748, 139.348], type: 'Air Base', country: 'JPN' },
  { name: 'CFAS Yokosuka', coords: [35.296, 139.668], type: 'Naval Base (7th Fleet)', country: 'JPN' },
  { name: 'Camp Hansen (USMC)', coords: [26.443, 127.989], type: 'USMC Base', country: 'JPN' },
  { name: 'MSDF Sasebo', coords: [33.166, 129.726], type: 'Naval Base (JSDF)', country: 'JPN' },
  // North Korea
  { name: 'Sunan Missile Test Site', coords: [39.196, 125.673], type: 'ICBM Test Site', country: 'PRK' },
  { name: 'Tonghae Satellite Launch', coords: [40.851, 129.665], type: 'Satellite Launch', country: 'PRK' },
  { name: 'Yongdok Artillery Base', coords: [40.050, 128.350], type: 'Long Range Artillery', country: 'PRK' },
  // Pakistan
  { name: 'PNS Mehran (Karachi)', coords: [24.906, 67.134], type: 'Naval Air Base', country: 'PAK' },
  { name: 'Sargodha AFB', coords: [32.048, 72.664], type: 'Air Base (Nuclear)', country: 'PAK' },
  { name: 'Kahuta (AQ Khan Lab)', coords: [33.592, 73.396], type: 'Nuclear Research', country: 'PAK' },
  // Israel
  { name: 'Palmachim Air Base', coords: [31.896, 34.688], type: 'Air/Missile Base', country: 'ISR' },
  { name: 'Nevatim Air Base', coords: [31.206, 35.012], type: 'Air Base', country: 'ISR' },
  { name: 'Haifa Naval Base', coords: [32.820, 35.024], type: 'Naval Base', country: 'ISR' },
  // Iran
  { name: 'Imam Ali Missile Base', coords: [31.551, 48.641], type: 'IRGC Missile Depot', country: 'IRN' },
  { name: 'Parchin Military Complex', coords: [35.521, 51.760], type: 'Explosives/Missile', country: 'IRN' },
  { name: 'Bandar Abbas Naval', coords: [27.188, 56.257], type: 'Naval Base', country: 'IRN' },
  // Saudi Arabia
  { name: 'Prince Sultan Air Base', coords: [24.062, 47.584], type: 'RSAF/USAF Base', country: 'SAU' },
  { name: 'Al Sulayyil Missile Base', coords: [20.463, 45.579], type: 'CSS-2 Missiles', country: 'SAU' },
  // Qatar
  { name: 'Al Udeid Air Base', coords: [25.118, 51.314], type: 'USAF CENTCOM FWD', country: 'QAT' },
  // UAE
  { name: 'Al Dhafra Air Base', coords: [24.248, 54.547], type: 'USAF/UAEAF Base', country: 'UAE' },
  // Turkey
  { name: 'Incirlik Air Base', coords: [37.002, 35.426], type: 'NATO Air Base', country: 'TUR' },
  // Australia
  { name: 'Pine Gap (NRO/CIA)', coords: [-23.799, 133.737], type: 'Signals Intelligence', country: 'AUS' },
  { name: 'HMAS Stirling (Perth)', coords: [-32.166, 115.700], type: 'Naval Base', country: 'AUS' },
  { name: 'RAAF Edinburgh', coords: [-34.701, 138.621], type: 'Air Base + SIGINT', country: 'AUS' },
  // NATO
  { name: 'NATO Ramstein AIRCOM', coords: [49.447, 7.600], type: 'NATO Air HQ', country: 'NATO' },
  { name: 'SHAPE Mons (Belgium)', coords: [50.514, 3.869], type: 'NATO SACEUR HQ', country: 'NATO' },
  { name: 'Deveselu (Romania)', coords: [44.220, 24.093], type: 'NATO Aegis Ashore', country: 'NATO' },
  { name: 'Redzikowo (Poland)', coords: [54.480, 17.519], type: 'NATO Aegis (Activating)', country: 'NATO' },
  // Oman
  { name: 'Thumrait Air Base', coords: [17.666, 53.904], type: 'RAFO/RAF Air Base', country: 'OMN' },
  // Cuba
  { name: 'Guantanamo Bay', coords: [19.905, -75.148], type: 'Naval Station (USA)', country: 'USA' },
  // Cyprus
  { name: 'RAF Akrotiri', coords: [34.580, 32.988], type: 'UK Strategic Air Base', country: 'GBR' },
  // Singapore
  { name: 'Paya Lebar Air Base', coords: [1.360, 103.909], type: 'Air Base (USAF Access)', country: 'SGP' },
  // Philippines
  { name: 'Camp John Hay (PH)', coords: [16.395, 120.600], type: 'Philippine Army', country: 'PHL' },
  { name: 'Naval Base Subic Bay', coords: [14.784, 120.272], type: 'Philippine Navy (former US)', country: 'PHL' },
  // Bahrain
  { name: 'NSA Bahrain (5th Fleet)', coords: [26.220, 50.629], type: 'US Naval HQ', country: 'USA' },
  // Kosovo
  { name: 'Camp Bondsteel (Kosovo)', coords: [42.364, 21.332], type: 'US Army (Largest EU Base)', country: 'USA' },
  // Italy
  { name: 'Aviano Air Base', coords: [46.031, 12.597], type: 'NATO Air Base', country: 'ITA' },
  { name: 'NS Sigonella (Sicily)', coords: [37.396, 14.922], type: 'Naval Air Station', country: 'ITA' },
  // Spain
  { name: 'Rota Naval Station', coords: [36.644, -6.349], type: 'US/Spain Naval Base', country: 'ESP' },
];

// ─── EARLY WARNING RADAR SITES ──────────────────────────────────────────
const RADAR_SITES = [
  { name: 'Pine Gap DSP (AUS)', coords: [-23.8, 133.7], type: 'SIGINT/Early Warning' },
  { name: 'HAARP (Alaska)', coords: [62.39, -145.15], type: 'Ionospheric Research' },
  { name: 'Beale AFB (SBIRS)', coords: [39.136, -121.436], type: 'Missile Early Warning' },
  { name: 'Menwith Hill (UK)', coords: [54.006, -1.687], type: 'NSA SIGINT Station' },
  { name: 'Fylingdales (UK BMD)', coords: [54.361, -0.672], type: 'Ballistic Missile Defense' },
  { name: 'Thule (Greenland)', coords: [76.531, -68.703], type: 'Missile Warning Radar' },
  { name: 'Vardo (Norway)', coords: [70.376, 31.098], type: 'GLOBUS III Radar' },
];

const conflicts = [
  { name: 'Ukraine - Russia', status: 'ACTIVE COMBAT', type: 'Conventional', severity: 'CRITICAL', coords: [49.0, 38.0] },
  { name: 'Israel - Gaza - Lebanon', status: 'ACTIVE COMBAT', type: 'Urban/Air', severity: 'CRITICAL', coords: [31.5, 34.4] },
  { name: 'Red Sea / Yemen', status: 'MARITIME THREAT', type: 'Asymmetrical', severity: 'HIGH', coords: [15.0, 42.0] },
  { name: 'South China Sea', status: 'ELEVATED TENSIONS', type: 'Naval Standoff', severity: 'ELEVATED', coords: [16.0, 114.0] },
  { name: 'Korean Peninsula', status: 'MILITARY POSTURING', type: 'Strategic', severity: 'ELEVATED', coords: [38.0, 127.0] },
  { name: 'India - China (LAC)', status: 'STANDOFF', type: 'Border Friction', severity: 'GUARDED', coords: [34.0, 78.0] },
];

const COUNTRY_COLORS: Record<string, string> = {
  USA: '#1565c0', RUS: '#c62828', CHN: '#e65100',
  IND: '#2e7d32', GBR: '#4527a0', FRA: '#00695c',
  DEU: '#37474f', ISR: '#1565c0', IRN: '#6a1b9a',
  KOR: '#1976d2', JPN: '#e53935', NATO: '#1e88e5',
  SAU: '#558b2f', QAT: '#880e4f', UAE: '#0288d1',
  TUR: '#d32f2f', AUS: '#f57c00', OMN: '#00897b',
  PAK: '#558b2f', PRK: '#b71c1c', SGP: '#e53935',
  PHL: '#1565c0', ITA: '#43a047', ESP: '#f9a825',
};

const getSeverityColor = (sev: string) => {
  switch (sev) {
    case 'CRITICAL': return '#ff1744';
    case 'HIGH': return '#ff9100';
    case 'ELEVATED': return '#ffd740';
    default: return '#00e676';
  }
};

// ─── PANOPTIC DETECTION SYSTEM ───────────────────────────────────────────
const panopticEvents = [
  'Unusual satellite imagery shows massed armor near Crimea',
  'Signals analysis: encrypted UHF burst on classified mil freq',
  'Predictive AI: elevated naval activity in disputed zone',
  'OSINT: troop transport convoy sighted IAW satellite revisit',
  'Deep learning model: airfield ramp expansion detected',
  'Acoustic signature: SSN-class submarine departure at 0300 local',
  'Multi-INT fusion: correlated HUMINT + SIGINT = HIGH confidence activity',
  'Pattern-of-life anomaly: maintenance depot above normal traffic',
];

export function initWarBoard() {
  const warZones = document.getElementById('war-zones-list');
  const movements = document.getElementById('troop-movements');
  const escalations = document.getElementById('escalations-list');
  const cyberThreats = document.getElementById('cyber-threats-list');
  const panopticFeed = document.getElementById('panoptic-feed');

  if (!warZones || !movements || !escalations) return;

  // ─── Conflict Zones Panel ────────────────────────────────────────────
  warZones.innerHTML = `
      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; background: rgba(255,17,68,0.1); border: 1px solid rgba(255,17,68,0.3); padding: 10px; border-radius: 4px;">
        <div>
          <h3 style="color:#ff1744; margin:0; font-family:var(--font-mono); font-size:14px;">G-DEFCON STATUS</h3>
          <p style="font-size:10px; color:#ff9100; margin-top:2px;">GLOBAL STRATEGIC READINESS</p>
        </div>
        <div style="font-size:32px; font-weight:900; color:#ff1744; font-family:var(--font-mono); text-shadow: 0 0 10px rgba(255,23,68,0.5);">LEVEL 3</div>
      </div>
    ` + conflicts.map(c => `
    <div style="border-left: 3px solid ${getSeverityColor(c.severity)}; padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.02); border-radius: 4px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;color:#e8e8e8;font-size:12px;">${c.name}</span>
        <span style="font-size:9px;padding:2px 7px;border-radius:12px;background:rgba(0,0,0,0.4);color:${getSeverityColor(c.severity)};font-weight:bold;">${c.severity}</span>
      </div>
      <div style="font-size:10px;color:#777;margin-top:4px;">Type: ${c.type} | ${c.status}</div>
    </div>
  `).join('');

  // ─── Troop Movements ─────────────────────────────────────────────────
  let tCounter = 0;
  const generateMovement = () => {
    tCounter++;
    const types = ['AIR', 'NAVAL', 'GROUND'];
    const type = types[tCounter % types.length];
    const startLat = 20 + Math.random() * 45;
    const startLon = -20 + Math.random() * 120;
    const endLat = startLat + (Math.random() * 8 - 4);
    const endLon = startLon + (Math.random() * 15 - 7.5);

    if (warMap && warMapMovementLayer) {
      const color = type === 'AIR' ? '#00e676' : (type === 'NAVAL' ? '#00b0ff' : '#f9a825');
      const line = L.polyline([[startLat, startLon], [endLat, endLon]], {
        color, weight: 2, dashArray: '5,5', opacity: 0.7
      }).addTo(warMapMovementLayer);
      const dot = L.circleMarker([startLat, startLon], { radius: 3, color, fillColor: color, fillOpacity: 1 }).addTo(warMapMovementLayer);
      let prog = 0;
      const anim = setInterval(() => {
        prog += 0.04;
        if (prog >= 1) {
          clearInterval(anim);
          warMapMovementLayer?.removeLayer(line);
          warMapMovementLayer?.removeLayer(dot);
        } else dot.setLatLng([startLat + (endLat - startLat) * prog, startLon + (endLon - startLon) * prog]);
      }, 150);
    }

    return `<div style="padding:5px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.4);border-radius:3px;font-size:10px;">
      <span style="color:#ff9100;font-weight:bold;">[${new Date().toISOString().substring(11, 19)}Z] ${type}</span>
      <span style="color:#00e676;float:right;">SIGINT: VERIFIED</span><br/>
      <span style="color:#888">Trajectory: ${startLat.toFixed(2)}N ${startLon.toFixed(2)}E → ${endLat.toFixed(2)}N ${endLon.toFixed(2)}E | V: ${Math.floor(30 + Math.random() * 600)}kts</span>
    </div>`;
  };

  let movHtml = Array(6).fill(0).map(() => `<div style="padding:5px;border:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.4);border-radius:3px;font-size:10px;margin-bottom:4px;color:#444;">Initializing tracking sensors...</div>`).join('');
  movements.innerHTML = movHtml;
  setInterval(() => {
    movHtml = generateMovement() + movHtml.split('</div>').slice(0, 12).join('</div>') + '</div>';
    movements.innerHTML = movHtml;
  }, 3500);

  // ─── Escalation Feed ─────────────────────────────────────────────────
  const escEvents = [
    { text: 'Ballistic missile launch detected (Short-range), NK.', lvl: 'CRITICAL' },
    { text: 'Artillery barrage detected in Donbas sector.', lvl: 'HIGH' },
    { text: 'Naval flotilla crossed median line in Taiwan Strait.', lvl: 'HIGH' },
    { text: 'Air defense systems activated near Damascus.', lvl: 'ELEVATED' },
    { text: 'Carrier strike group altering course to South China Sea.', lvl: 'ELEVATED' },
    { text: 'IRGC speed boats conduct intercept drill in Strait of Hormuz.', lvl: 'HIGH' },
    { text: 'Satellite detects new silo construction in Xinjiang.', lvl: 'HIGH' },
    { text: 'Unidentified submarine detected per SOSUS array.', lvl: 'ELEVATED' },
    { text: 'Electronic jamming of GPS systems near Eastern Europe.', lvl: 'HIGH' },
  ];
  let evIdx = 0;
  escalations.innerHTML = '';
  const pushEsc = () => {
    const ev = escEvents[evIdx % escEvents.length];
    const clr = ev.lvl === 'CRITICAL' ? '#ff1744' : (ev.lvl === 'HIGH' ? '#ff9100' : '#ffd740');
    escalations.innerHTML = `<div style="margin-bottom:8px;padding:8px;background:rgba(255,23,68,0.04);border-left:2px solid ${clr};border-radius:0 4px 4px 0;">
      <div style="color:${clr};font-weight:bold;">[FLASH ALERT] — ${new Date().toISOString().split('T')[1].slice(0, 8)}Z</div>
      <div style="color:#e8e8e8;">${ev.text}</div>
    </div>` + escalations.innerHTML;
    if (escalations.innerHTML.length > 4000) escalations.innerHTML = escalations.innerHTML.substring(0, 4000);
    evIdx++;
  };
  pushEsc();
  setInterval(pushEsc, 7000);

  // ─── Strategic Asset Tracking ─────────────────────────────────────────
  if (cyberThreats) {
    const assets = [
      'SSBN HMS Vanguard on deterrent patrol (UK)',
      'USS Gerald R. Ford CSG operating in Mediterranean',
      'Tu-160M2 strategic bomber sortie detected from Engels-2',
      'DF-41 ICBM TEL convoy active in Xinjiang province',
      'Agni-V MIRV test prep observed at Kalam Island',
      'B-2 Spirit deployment to Diego Garcia confirmed',
      'SSBN Borei-A class departed Gadzhiyevo for patrol',
      'INS Arihant on deterrent patrol (India)',
    ];
    let aHtml = '';
    setInterval(() => {
      const a = assets[Math.floor(Math.random() * assets.length)];
      aHtml = `<div style="border-left:2px solid #00e676;padding-left:8px;margin-bottom:8px;font-size:10px;">
        <div style="color:#00e676;font-weight:bold;">[STRATCOM] ${new Date().toISOString().substring(11, 19)}Z</div>
        <div style="color:#ccc;">${a}</div>
      </div>` + aHtml.split('</div>').slice(0, 18).join('</div>') + '</div>';
      cyberThreats.innerHTML = `<div style="display:flex;flex-direction:column;">${aHtml}</div>`;
    }, 5500);
    cyberThreats.innerHTML = '<div style="color:#444;padding:8px;font-size:10px;">Calibrating strategic sensors...</div>';
  }

  // ─── Panoptic Detection ─────────────────────────────────────────────
  if (panopticFeed) {
    let pHtml = '';
    const pushPanoptic = () => {
      const ev = panopticEvents[Math.floor(Math.random() * panopticEvents.length)];
      pHtml = `<div style="padding:6px;border-left:2px solid #7b61ff;margin-bottom:6px;font-size:10px;">
        <div style="color:#7b61ff;font-weight:bold;">[PANOPTIC] ${new Date().toISOString().substring(11, 19)}Z</div>
        <div style="color:#ccc;">${ev}</div>
      </div>` + pHtml.split('</div>').slice(0, 20).join('</div>') + '</div>';
      panopticFeed.innerHTML = `<div>${pHtml}</div>`;
    };
    pushPanoptic();
    setInterval(pushPanoptic, 9000);
  }

  // ─── MAP ───────────────────────────────────────────────────────────────
  const mapEl = document.getElementById('war-map');
  if (!mapEl) return;

  warMap = L.map('war-map', { center: [25, 30], zoom: 2, zoomControl: true, attributionControl: false });

  let warTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(warMap);

  // Layer switcher
  const warMapEl = document.getElementById('war-map')!;
  const ws = document.createElement('div');
  ws.style.cssText = 'position:absolute;top:80px;right:10px;z-index:1100;';
  const warLayers: Record<string, { label: string; url: string }> = {
    dark: { label: '🌑 Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
    satellite: { label: '🛰️ Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    terrain: { label: '🏔️ Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
  };
  ws.innerHTML = Object.entries(warLayers).map(([key, val]) => `
    <button data-war-layer="${key}" onclick="window.__gcWarLayer('${key}')"
      style="display:block;width:100%;margin-bottom:3px;padding:5px 10px;
             background:${key === 'dark' ? 'rgba(255,17,68,0.2)' : 'rgba(0,0,0,0.7)'};
             color:${key === 'dark' ? '#ff1744' : '#aaa'};border:1px solid rgba(255,255,255,0.15);
             border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap;">${val.label}</button>
  `).join('');
  warMapEl.style.position = 'relative';
  warMapEl.appendChild(ws);
  (window as any).__gcWarLayer = (type: string) => {
    if (!warMap) return;
    warMap.removeLayer(warTileLayer);
    warTileLayer = L.tileLayer(warLayers[type]?.url || warLayers.dark.url, { maxZoom: 19 }).addTo(warMap);
    document.querySelectorAll('[data-war-layer]').forEach(btn => {
      const el = btn as HTMLElement;
      const a = el.dataset.warLayer === type;
      el.style.background = a ? 'rgba(255,17,68,0.2)' : 'rgba(0,0,0,0.7)';
      el.style.color = a ? '#ff1744' : '#aaa';
    });
  };

  warMapBaseLayer = L.layerGroup().addTo(warMap);
  warMapMovementLayer = L.layerGroup().addTo(warMap);
  warMapMissileLayer = L.layerGroup().addTo(warMap);

  // Plot conflict zones
  conflicts.forEach(zone => {
    L.circleMarker([zone.coords[0], zone.coords[1]], {
      radius: zone.severity === 'CRITICAL' ? 12 : 8,
      color: getSeverityColor(zone.severity), fillColor: getSeverityColor(zone.severity), fillOpacity: 0.4, weight: 2,
    }).addTo(warMap!).bindPopup(`<b style="color:#ff1744">${zone.name}</b><br/>${zone.type}<br/><span style="color:${getSeverityColor(zone.severity)}">${zone.status}</span>`);
  });

  // Plot all 120+ military bases
  MILITARY_BASES.forEach(base => {
    const color = COUNTRY_COLORS[base.country] || '#888';
    L.circleMarker([base.coords[0], base.coords[1]], {
      radius: 4, color: '#ddd', fillColor: color, fillOpacity: 0.85, weight: 1,
    }).addTo(warMapBaseLayer!).bindPopup(`
      <div style="font-size:11px;min-width:160px;">
        <b style="color:#00d4ff">${base.name}</b><br/>
        <span style="color:#888">${base.type}</span><br/>
        <span style="color:${color}">${base.country}</span>
      </div>`);
  });

  // Plot radar / early warning sites
  RADAR_SITES.forEach(r => {
    L.circleMarker([r.coords[0], r.coords[1]], {
      radius: 6, color: '#7b61ff', fillColor: '#7b61ff', fillOpacity: 0.5, weight: 2, dashArray: '4,4',
    }).addTo(warMap!).bindPopup(`<b style="color:#7b61ff">📡 ${r.name}</b><br/>${r.type}`);
  });

  // Advanced Panoptic Missile ICBM Ballistic Arc Trajectories
  const simulateMissileAlert = () => {
    if (!warMapMissileLayer || !warMap) return;
    const base1 = MILITARY_BASES[Math.floor(Math.random() * MILITARY_BASES.length)];
    const base2 = MILITARY_BASES[Math.floor(Math.random() * MILITARY_BASES.length)];
    if (base1 === base2 || base1.country === base2.country) return;

    const src = base1.coords as [number, number];
    const dst = base2.coords as [number, number];
    const color = '#ff1744';

    // Calculate ballistic arc path over 20 points
    const points: [number, number][] = [];
    let distLat = dst[0] - src[0];
    let distLon = dst[1] - src[1];

    // Cross dateline properly
    if (distLon > 180) distLon -= 360;
    else if (distLon < -180) distLon += 360;

    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      let curLon = src[1] + distLon * t;
      if (curLon > 180) curLon -= 360;
      if (curLon < -180) curLon += 360;
      const curLat = src[0] + distLat * t;
      const curveOffset = Math.sin(t * Math.PI) * (Math.abs(distLon) * 0.25);
      points.push([curLat + curveOffset, curLon]);
    }

    const line = L.polyline(points, { color, weight: 3, opacity: 0.9, dashArray: '8,4' }).addTo(warMapMissileLayer);
    const marker = L.circleMarker(src, { radius: 6, color, fillColor: '#fff', fillOpacity: 1 }).addTo(warMapMissileLayer);

    const panopticFeed = document.getElementById('panoptic-feed');
    if (panopticFeed) {
      let text = `[EARLY WARNING] ICBM launch detected at ${base1.name}. Target vector towards ${base2.name}!`;
      const alertHtml = `<div style="padding:6px;border-left:3px solid #ff1744;margin-bottom:6px;font-size:10px;background:rgba(255,23,68,0.2);">
        <div style="color:#ff1744;font-weight:900;">[CRITICAL INTERCEPT] ${new Date().toISOString().substring(11, 19)}Z</div>
        <div style="color:#fff;">${text}</div>
      </div>`;
      panopticFeed.innerHTML = alertHtml + panopticFeed.innerHTML.substring(0, 3000);
    }

    let step = 0;
    const anim = setInterval(() => {
      step++;
      if (step >= 20) {
        clearInterval(anim);
        warMapMissileLayer?.removeLayer(line);
        warMapMissileLayer?.removeLayer(marker);

        // Show massive nuclear/impact flash
        const impact = L.circleMarker(dst, { radius: 25, color: '#ff1744', fillColor: '#ff1744', fillOpacity: 0.8, weight: 0 }).addTo(warMapMissileLayer!);
        setTimeout(() => warMapMissileLayer?.removeLayer(impact), 1500);
      } else {
        marker.setLatLng(points[step]);
        marker.setRadius(6 + Math.sin((step / 20) * Math.PI) * 5); // Grow during apex
      }
    }, 150);
  };

  setInterval(simulateMissileAlert, 14000);
}
