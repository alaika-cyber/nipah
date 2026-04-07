import { useState, useEffect, useMemo } from 'react';
import { Activity, AlertOctagon, Flame, CircleCheckBig } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { getStateStats, getZoneSummary, type StateStat, type ZoneSummary } from '../services/api';

// Default center of India
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

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
  const [geoData, setGeoData] = useState<any>(null);
  const maxCases = useMemo(() => Math.max(1, ...states.map((s: StateStat) => s.active_cases)), [states]);

  useEffect(() => {
    Promise.all([getStateStats(), getZoneSummary()]).then(([stateRes, summaryRes]) => {
      setStates(stateRes.states);
      setSummary(summaryRes);
    });

    fetch('https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("GeoJSON Load Error:", err));
  }, []);

  const getStyle = (feature: any) => {
    const geoStateName = feature.properties.ST_NM || feature.properties.NAME || "";
    // Case-insensitive match for state names
    const stateData = states.find(s => s.state_name.toLowerCase() === geoStateName.toLowerCase());
    const zone = stateData ? stateData.zone : 'Green';
    
    return {
      fillColor: getZoneColor(zone),
      weight: 1.5,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.6,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const geoStateName = feature.properties.ST_NM || feature.properties.NAME || "";
    const state = states.find(s => s.state_name.toLowerCase() === geoStateName.toLowerCase());
    
    if (state) {
      layer.bindTooltip(`<strong>${state.state_name}</strong>: ${state.zone} Zone`, {
        sticky: true,
        direction: 'top',
        className: 'custom-tooltip'
      });

      layer.bindPopup(`
        <div class="text-sm font-sans min-w-[150px]">
          <h4 class="font-bold border-b pb-1 mb-2">${state.state_name}</h4>
          <div class="flex justify-between mb-1">
            <span class="text-gray-600">Active Cases:</span>
            <span class="font-bold text-gray-900">${state.active_cases}</span>
          </div>
          <div class="flex justify-between mb-1">
            <span class="text-gray-600">Deaths:</span>
            <span class="font-bold text-red-600">${state.deaths}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Zone Level:</span>
            <span class="font-bold ${state.zone === 'Red' ? 'text-red-500' : state.zone === 'Orange' ? 'text-orange-500' : 'text-emerald-500'}">
              ${state.zone}
            </span>
          </div>
        </div>
      `);
    } else {
      layer.bindTooltip(`<strong>${geoStateName}</strong>: No Data`, { sticky: true });
    }
    
    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.8, weight: 2 });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.6, weight: 1.5 });
      }
    });
  };

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
          
          {geoData && (
            <GeoJSON 
              data={geoData} 
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}
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
          {states.map((state: StateStat) => (
            <div key={state.state_name} className={`rounded-xl border px-3 py-2 ${zoneStyles(state.zone)}`}>
              <div className="text-sm font-semibold">{state.state_name}</div>
              <div className="text-xs">{state.zone} Zone</div>
            </div>
          ))}
          {states.length === 0 && <p className="text-sm text-gray-500">No state data available.</p>}
        </div>
        <div className="space-y-2">
          {states.map((state: StateStat) => (
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
            {states.map((state: StateStat) => (
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
