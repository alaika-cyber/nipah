import { useState } from 'react';
import { MessageCircle, Droplets, ClipboardList, AlertTriangle } from 'lucide-react';
import ChatBot from './components/ChatBot';
import BloodRisk from './components/BloodRisk';
import SymptomRisk from './components/SymptomRisk';

type Tab = 'chatbot' | 'blood' | 'symptoms';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'chatbot',
    label: 'AI Chatbot',
    icon: <MessageCircle size={20} />,
    description: 'Ask questions about Nipah virus',
  },
  {
    id: 'blood',
    label: 'Blood Risk',
    icon: <Droplets size={20} />,
    description: 'ML-based blood parameter analysis',
  },
  {
    id: 'symptoms',
    label: 'Symptom Check',
    icon: <ClipboardList size={20} />,
    description: 'Rule-based symptom assessment',
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chatbot');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">
                N
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">
                  Nipah Virus Awareness Platform
                </h1>
                <p className="text-xs text-gray-400">
                  AI-Powered Health Education & Risk Assessment
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full">
              <AlertTriangle size={12} />
              <span>Educational purposes only</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
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
                <span
                  className={`hidden md:inline text-xs ${
                    activeTab === tab.id ? 'text-indigo-200' : 'text-gray-600'
                  }`}
                >
                  — {tab.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full">
        {activeTab === 'chatbot' && <ChatBot />}
        {activeTab === 'blood' && <BloodRisk />}
        {activeTab === 'symptoms' && <SymptomRisk />}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/50 border-t border-gray-800 py-3 px-4 text-center text-xs text-gray-500">
        <p>
          ⚠️ This platform is for <strong>educational purposes only</strong>.
          It does NOT provide medical diagnosis. Always consult healthcare professionals.
        </p>
      </footer>
    </div>
  );
}

export default App;
