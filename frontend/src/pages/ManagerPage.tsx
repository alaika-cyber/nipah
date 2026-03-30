import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, AlertOctagon, CircleCheckBig, Flame, LogIn, LogOut, UserPlus, Stethoscope, PlusCircle } from 'lucide-react';
import {
  authLogin,
  authSignup,
  getStateStats,
  getZoneSummary,
  getHospitals,
  getDoctorsByHospital,
  registerDoctor,
  type Doctor,
  type StateStat,
  type ZoneSummary,
} from '../services/api';

function zoneStyles(zone: 'Red' | 'Orange' | 'Green') {
  if (zone === 'Red') return 'bg-red-500/15 border-red-500/40 text-red-300';
  if (zone === 'Orange') return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
}

export default function ManagerPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');

  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [isSignup, setIsSignup] = useState(false);

  const [states, setStates] = useState<StateStat[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);
  const maxCases = useMemo(() => Math.max(1, ...states.map((s) => s.active_cases)), [states]);

  const [managerPassword, setManagerPassword] = useState('');
  const [myHospitalId, setMyHospitalId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorForm, setDoctorForm] = useState({
    name: '', specialization: '', contact: '', username: '', password: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const [stateRes, summaryRes] = await Promise.all([getStateStats(), getZoneSummary()]);
      setStates(stateRes.states);
      setSummary(summaryRes);
      
      if (myHospitalId) {
        const docs = await getDoctorsByHospital(myHospitalId);
        setDoctors(docs.doctors);
      } else if (authenticated) {
        // Fallback fetch if hospital wasn't resolved yet
        const { hospitals } = await getHospitals();
        const myHosp = hospitals.find(h => h.manager_username === email);
        if (myHosp) {
          setMyHospitalId(myHosp.id);
          const docs = await getDoctorsByHospital(myHosp.id);
          setDoctors(docs.doctors);
        }
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (authenticated) refresh();
  }, [authenticated]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      if (isSignup) {
        await authSignup({ role: 'manager', email: authForm.email, password: authForm.password });
        setMessage('Signup submitted! Waiting for admin approval.');
        setIsSignup(false);
      } else {
        await authLogin({ role: 'manager', email: authForm.email, password: authForm.password });
        setAuthenticated(true);
        setEmail(authForm.email);
        setManagerPassword(authForm.password);
        setMessage('Login successful.');
      }
    } catch {
      setError(isSignup ? 'Signup failed. Email may already exist.' : 'Login failed. Check credentials or pending approval.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setEmail('');
    setManagerPassword('');
    setMyHospitalId(null);
    setDoctors([]);
    setAuthForm({ email: '', password: '' });
    setStates([]);
    setSummary(null);
    setMessage('');
    setError('');
  };

  const handleRegisterDoctor = async (e: FormEvent) => {
    e.preventDefault();
    if (!myHospitalId) {
      setError("Cannot register doctor: No hospital associated with this manager account.");
      return;
    }
    setError(''); setMessage(''); setIsLoading(true);
    
    // Auto-generate Standard 9AM-5PM blocks for weekdays
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const standardSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
    const defaultAvailability: Record<string, string[]> = {};
    for (const day of weekdays) {
      defaultAvailability[day] = [...standardSlots];
    }

    try {
      await registerDoctor({
        ...doctorForm,
        hospital_id: myHospitalId,
        manager_username: email,
        manager_password: managerPassword,
        availability: defaultAvailability
      });
      setMessage('Doctor registered successfully.');
      setDoctorForm({ name: '', specialization: '', contact: '', username: '', password: '' });
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to register doctor.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIN / SIGNUP VIEW ---
  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-12 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">{isSignup ? 'Manager Signup' : 'Manager Login'}</h2>
          <p className="text-gray-400 text-sm mt-1">
            {isSignup ? 'Create an account. Admin approval is required before access.' : 'Login to access the monitoring dashboard.'}
          </p>
        </div>

        {message && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm">{message}</div>}
        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>}

        <form onSubmit={handleAuth} className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="manager@example.com"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="••••••••"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
          </div>
          <button
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg font-medium disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isLoading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Login'}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(!isSignup); setError(''); setMessage(''); }}
            className="w-full text-sm text-gray-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </form>
      </div>
    );
  }

  // --- AUTHENTICATED DASHBOARD ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Manager Monitoring Dashboard</h2>
          <p className="text-gray-400 text-sm">Logged in as <span className="text-amber-400">{email}</span></p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {message && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm">{message}</div>}

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                  className={`h-full ${state.zone === 'Red' ? 'bg-red-500' : state.zone === 'Orange' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: `${(state.active_cases / maxCases) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Manager Monitoring Table */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-3">Manager View: Monitoring Fields</h3>
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="py-2">State</th>
              <th className="py-2">Active Cases</th>
              <th className="py-2">Deaths</th>
              <th className="py-2">Zone</th>
              <th className="py-2">Last Updated</th>
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
                <td className="py-2">{new Date(state.last_updated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Doctor Registration & View */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Stethoscope size={18} />
          Hospital Directory: Register Doctor
        </h3>
        
        {!myHospitalId ? (
          <div className="p-3 bg-amber-500/10 text-amber-300 rounded-lg text-sm border border-amber-500/20 mb-4">
            No active hospital linked to this account yet. Tell an Admin to register your Hospital with the email: <strong>{email}</strong>
          </div>
        ) : (
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6" onSubmit={handleRegisterDoctor}>
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Dr. XYZ (Name)" value={doctorForm.name} onChange={(e) => setDoctorForm({...doctorForm, name: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Specialization (e.g. Virologist)" value={doctorForm.specialization} onChange={(e) => setDoctorForm({...doctorForm, specialization: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Contact Details" value={doctorForm.contact} onChange={(e) => setDoctorForm({...doctorForm, contact: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Doctor Username" value={doctorForm.username} onChange={(e) => setDoctorForm({...doctorForm, username: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Doctor Password" type="password" minLength={6} value={doctorForm.password} onChange={(e) => setDoctorForm({...doctorForm, password: e.target.value})} required />
            <button disabled={isLoading} className="lg:col-span-5 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium disabled:opacity-60 text-white py-2 flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <PlusCircle size={18} />
              Register Expected Doctor (Standard 9-5 Schedule)
            </button>
          </form>
        )}

        <h4 className="text-md font-semibold text-gray-300 mb-2">Registered Doctors at this Hospital</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400">
                <th className="py-2">Name</th>
                <th className="py-2">Specialization</th>
                <th className="py-2">Contact</th>
                <th className="py-2">System Username</th>
                <th className="py-2">Registered On</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.id} className="border-b border-gray-800 text-gray-200">
                  <td className="py-2 font-medium">{d.name}</td>
                  <td className="py-2">{d.specialization}</td>
                  <td className="py-2">{d.contact}</td>
                  <td className="py-2">{d.username}</td>
                  <td className="py-2">{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {doctors.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">No doctors registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
