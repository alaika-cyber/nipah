import { AlertTriangle, User, Briefcase, ShieldAlert } from 'lucide-react';
import { Routes, Route, NavLink } from 'react-router-dom';
import UserPage from './pages/UserPage';
import ManagerPage from './pages/ManagerPage';
import AdminPage from './pages/AdminPage';

const NAV_LINKS = [
  { to: '/', label: 'User', icon: <User size={18} /> },
  { to: '/manager', label: 'Manager', icon: <Briefcase size={18} /> },
  { to: '/admin', label: 'Admin', icon: <ShieldAlert size={18} /> },
];

function App() {
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
                  AI-Powered Health Education &amp; Risk Assessment
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

      {/* Role Navigation */}
      <nav className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">
        <Routes>
          <Route path="/" element={<UserPage />} />
          <Route path="/manager" element={<ManagerPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
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
