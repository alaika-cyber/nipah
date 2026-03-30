import { useState } from 'react';
import { MessageCircle, Droplets, ClipboardList, Hospital } from 'lucide-react';
import ChatBot from '../components/ChatBot';
import BloodRisk from '../components/BloodRisk';
import SymptomRisk from '../components/SymptomRisk';
import HospitalBooking from '../components/HospitalBooking';

type Tab = 'chatbot' | 'blood' | 'symptoms' | 'hospital';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'chatbot', label: 'AI Chatbot', icon: <MessageCircle size={20} />, description: 'Ask questions about Nipah virus' },
  { id: 'blood', label: 'Blood Risk', icon: <Droplets size={20} />, description: 'ML-based blood parameter analysis' },
  { id: 'symptoms', label: 'Symptom Check', icon: <ClipboardList size={20} />, description: 'Rule-based symptom assessment' },
  { id: 'hospital', label: 'Hospitals & Booking', icon: <Hospital size={20} />, description: 'Find hospitals and book appointments' },
];

export default function UserPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chatbot');

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
    </div>
  );
}
