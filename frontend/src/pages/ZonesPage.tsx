import { useState, useEffect, useMemo } from 'react';
import { Activity, AlertOctagon, Flame, CircleCheckBig } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import { getStateStats, getZoneSummary, type StateStat, type ZoneSummary } from '../services/api';

// Map of state names to [lat, lng] coordinates
const STATE_COORDINATES: Record<string, [number, number]> = {
  'Kerala': [10.8505, 76.2711],
  'Karnataka': [15.3173, 75.7139],
  'Tamil Nadu': [11.1271, 78.6569],
  'Maharashtra': [19.7515, 75.7139],
  'Andhra Pradesh': [15.9129, 79.7400],
  'Delhi': [28.7041, 77.1025],
  'Gujarat': [22.2587, 71.1924],
  'West Bengal': [22.9868, 87.8550],
  'Uttar Pradesh': [26.8467, 80.9462],
  'Rajasthan': [27.0238, 74.2179],
  'Madhya Pradesh': [22.9734, 78.6569],
  'Bihar': [25.0961, 85.3131],
  'Punjab': [31.1471, 75.3412],
  'Haryana': [29.0588, 76.0856]
};

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // Center of India

function zoneStyles(zone: 'Red' | 'Orange' | 'Green') {
  if (zone === 'Red') return 'bg-red-500/15 border-red-500/40 text-red-300';
  if (zone === 'Orange') return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
}

function getZoneColor(zone: 'Red' | 'Orange' | 'Green') {
  if (zone === 'Red') return '#ef4444';
  if (zone === 'Orange') return '#f97316';
  return '#10b981';
}

export default function ZonesPage() {
  const [states, setStates] = useState<StateStat[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);
  const maxCases = useMemo(() => Math.max(1, ...states.map((s) => s.active_cases)), [states]);

  useEffect(() => {
    Promise.all([getStateStats(), getZoneSummary()]).then(([stateRes, summaryRes]) => {
      setStates(stateRes.states);
      setSummary(summaryRes);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          🗺️ Outbreak Zone Overview
        </h2>
        <p className="text-gray-400 mt-1">
          Interactive map and statistical overview of current risk zones across states.
        </p>
      </div>

      {/* Interactive Map */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl overflow-hidden h-[400px] md:h-[500px] shadow-lg">
        <MapContainer 
          center={DEFAULT_CENTER} 
          zoom={5} 
          scrollWheelZoom={false}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          
          {states.map((state) => {
            const coords = STATE_COORDINATES[state.state_name] || DEFAULT_CENTER;
            const color = getZoneColor(state.zone);
            // Size of bubble based on cases relative to maxCases (minimum radius of 8)
            const radius = Math.max(8, (state.active_cases / maxCases) * 24);
            
            return (
              <CircleMarker 
                key={state.state_name}
                center={coords}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.6,
                  color: color,
                  weight: 2
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="font-semibold">{state.state_name} ({state.zone} Zone)</div>
                </Tooltip>
                <Popup>
                  <div className="text-sm font-sans min-w-[150px]">
                    <h4 className="font-bold border-b pb-1 mb-2">{state.state_name}</h4>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Active Cases:</span>
                      <span className="font-bold text-gray-900">{state.active_cases}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Deaths:</span>
                      <span className="font-bold text-red-600">{state.deaths}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zone Level:</span>
                      <span className={`font-bold ${state.zone === 'Red' ? 'text-red-500' : state.zone === 'Orange' ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {state.zone}
                      </span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="text-red-200 text-sm mb-1 flex items-center gap-2"><AlertOctagon size={16} />Red Zones</div>
          <div className="text-2xl font-bold text-white">{summary?.zones.Red ?? 0}</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
          <div className="text-orange-200 text-sm mb-1 flex items-center gap-2"><Flame size={16} />Orange Zones</div>
          <div className="text-2xl font-bold text-white">{summary?.zones.Orange ?? 0}</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
          <div className="text-emerald-200 text-sm mb-1 flex items-center gap-2"><CircleCheckBig size={16} />Green Zones</div>
          <div className="text-2xl font-bold text-white">{summary?.zones.Green ?? 0}</div>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4">
          <div className="text-sky-200 text-sm mb-1 flex items-center gap-2"><Activity size={16} />Total Active</div>
          <div className="text-2xl font-bold text-white">{summary?.total_active_cases ?? 0}</div>
        </div>
      </section>

      {/* Zone View progress bars and stats list */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Zone Progression</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {states.map((state) => (
            <div key={state.state_name} className={`rounded-xl border px-3 py-2 ${zoneStyles(state.zone)}`}>
              <div className="text-sm font-semibold">{state.state_name}</div>
              <div className="text-xs">{state.zone} Zone</div>
            </div>
          ))}
          {states.length === 0 && <p className="text-sm text-gray-500">No state data available.</p>}
        </div>
        <div className="space-y-2">
          {states.map((state) => (
            <div key={`${state.state_name}-bar`} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>{state.state_name}</span>
                <span>{state.active_cases} active, {state.deaths} deaths</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    state.zone === 'Red' ? 'bg-red-500' : state.zone === 'Orange' ? 'bg-orange-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(state.active_cases / maxCases) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Table */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-3">State Statistics Detail</h3>
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="py-2">State</th>
              <th className="py-2">Active Cases</th>
              <th className="py-2">Deaths</th>
              <th className="py-2">Zone</th>
            </tr>
          </thead>
          <tbody>
            {states.map((state) => (
              <tr key={state.state_name} className="border-b border-gray-800 text-gray-200">
                <td className="py-2">{state.state_name}</td>
                <td className="py-2">{state.active_cases}</td>
                <td className="py-2">{state.deaths}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded-md border text-xs ${zoneStyles(state.zone)}`}>{state.zone}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
}
