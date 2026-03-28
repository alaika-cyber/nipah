import { useState, useEffect, useMemo } from 'react';
import { MessageCircle, Droplets, ClipboardList, Hospital, Activity, AlertOctagon, Flame, CircleCheckBig } from 'lucide-react';
import ChatBot from '../components/ChatBot';
import BloodRisk from '../components/BloodRisk';
import SymptomRisk from '../components/SymptomRisk';
import HospitalBooking from '../components/HospitalBooking';
import { getStateStats, getZoneSummary, type StateStat, type ZoneSummary } from '../services/api';

type Tab = 'chatbot' | 'blood' | 'symptoms' | 'hospital';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'chatbot', label: 'AI Chatbot', icon: <MessageCircle size={20} />, description: 'Ask questions about Nipah virus' },
  { id: 'blood', label: 'Blood Risk', icon: <Droplets size={20} />, description: 'ML-based blood parameter analysis' },
  { id: 'symptoms', label: 'Symptom Check', icon: <ClipboardList size={20} />, description: 'Rule-based symptom assessment' },
  { id: 'hospital', label: 'Hospitals & Booking', icon: <Hospital size={20} />, description: 'Find hospitals and book appointments' },
];

function zoneStyles(zone: 'Red' | 'Orange' | 'Green') {
  if (zone === 'Red') return 'bg-red-500/15 border-red-500/40 text-red-300';
  if (zone === 'Orange') return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
}

export default function UserPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chatbot');
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
      {/* Feature Tabs */}
      <nav className="bg-gray-900/50 border-b border-gray-800 -mx-4 px-4">
        <div className="flex gap-1 overflow-x-auto py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`hidden md:inline text-xs ${activeTab === tab.id ? 'text-indigo-200' : 'text-gray-600'}`}>
                — {tab.description}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <div>
        {activeTab === 'chatbot' && <ChatBot />}
        {activeTab === 'blood' && <BloodRisk />}
        {activeTab === 'symptoms' && <SymptomRisk />}
        {activeTab === 'hospital' && <HospitalBooking />}
      </div>

      {/* Public Zone Overview */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <h3 className="text-lg font-semibold text-white">🗺️ Outbreak Zone Overview</h3>

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

        {/* Zone View */}
        <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Zone View</h3>
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
          <h3 className="text-lg font-semibold text-white mb-3">State Statistics</h3>
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
    </div>
  );
}
