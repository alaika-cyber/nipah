import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  CircleCheckBig,
  Flame,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Building2,
  PlusCircle,
  MapPin,
  Locate,
  Search,
  Stethoscope,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import {
  authLogin,
  getStateStats,
  getZoneSummary,
  upsertStateStats,
  getPendingManagerRequests,
  approveManagerRequest,
  getHospitals,
  registerHospital,
  adminRegisterDoctor,
  getDoctorsByHospital,
  type StateStat,
  type ZoneSummary,
  type PendingManagerRequest,
  type Hospital,
  type Doctor,
} from '../services/api';

function zoneStyles(zone: 'Red' | 'Orange' | 'Green') {
  if (zone === 'Red') return 'bg-red-500/15 border-red-500/40 text-red-300';
  if (zone === 'Orange') return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
}

function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 13);
    }
  }, [lat, lng, map]);
  return null;
}

function MapEvents({ setHospitalForm, setIsGeocoding, setError, setMessage }: any) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setHospitalForm((prev: any) => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
      
      setIsGeocoding(true);
      setError('');
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.address) {
          setHospitalForm((prev: any) => ({
            ...prev,
            address: (data.display_name || prev.address).slice(0, 250),
            city: (data.address.city || data.address.town || data.address.state || prev.city).slice(0, 80)
          }));
          setMessage('Address auto-filled from map click.');
        } else {
          setMessage('No address found at this map location.');
        }
      } catch {
        setError('Failed to fetch address from map click.');
      } finally {
        setIsGeocoding(false);
      }
    }
  });
  return null;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [authForm, setAuthForm] = useState({ email: '', password: '' });

  const [states, setStates] = useState<StateStat[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);
  const maxCases = useMemo(() => Math.max(1, ...states.map((s) => s.active_cases)), [states]);

  const [pendingManagers, setPendingManagers] = useState<PendingManagerRequest[]>([]);

  const [form, setForm] = useState({ state_name: '', active_cases: '', deaths: '', updated_by: 'admin' });

  // Hospital Registry
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalForm, setHospitalForm] = useState({
    name: '', address: '', city: '', contact: '', latitude: '', longitude: '', manager_username: '', manager_password: ''
  });

  // Doctor Registry
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | ''>('');
  const [adminDoctors, setAdminDoctors] = useState<Doctor[]>([]);
  const [doctorForm, setDoctorForm] = useState({
    name: '', specialization: '', contact: '', username: '', password: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const [stateRes, summaryRes, hosRes] = await Promise.all([getStateStats(), getZoneSummary(), getHospitals()]);
      setStates(stateRes.states);
      setSummary(summaryRes);
      setHospitals(hosRes.hospitals);
    } catch {
      /* silent */
    }
  };

  const refreshPending = async () => {
    try {
      const res = await getPendingManagerRequests(adminEmail, adminPassword);
      setPendingManagers(res.pending_requests);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (authenticated) {
      refresh();
      refreshPending();
    }
  }, [authenticated]);

  useEffect(() => {
    if (selectedHospitalId) {
      getDoctorsByHospital(typeof selectedHospitalId === 'string' ? parseInt(selectedHospitalId) : selectedHospitalId)
        .then(res => setAdminDoctors(res.doctors))
        .catch(() => setAdminDoctors([]));
    } else {
      setAdminDoctors([]);
    }
  }, [selectedHospitalId]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await authLogin({ role: 'admin', email: authForm.email, password: authForm.password });
      setAuthenticated(true);
      setAdminEmail(authForm.email);
      setAdminPassword(authForm.password);
      setMessage('Admin login successful.');
    } catch {
      setError('Login failed. Check admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAdminEmail('');
    setAdminPassword('');
    setAuthForm({ email: '', password: '' });
    setStates([]);
    setSummary(null);
    setPendingManagers([]);
    setHospitals([]);
    setMessage('');
    setError('');
  };

  const handleUpdateStats = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await upsertStateStats({
        state_name: form.state_name,
        active_cases: Number.parseInt(form.active_cases, 10),
        deaths: Number.parseInt(form.deaths, 10),
        updated_by: form.updated_by || 'admin',
        admin_email: adminEmail,
        admin_password: adminPassword,
      });
      setMessage('State data updated successfully.');
      setForm({ ...form, state_name: '', active_cases: '', deaths: '' });
      await refresh();
    } catch {
      setError('Failed to update state data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (managerEmail: string) => {
    setError('');
    setMessage('');
    try {
      await approveManagerRequest(adminEmail, adminPassword, managerEmail);
      setMessage(`Manager ${managerEmail} approved.`);
      await refreshPending();
    } catch {
      setError(`Failed to approve ${managerEmail}.`);
    }
  };

  const handleGeocode = async () => {
    if (!hospitalForm.address && !hospitalForm.city) {
      setError('Please enter an address or city to auto-fill coordinates.');
      return;
    }
    setIsGeocoding(true);
    setError('');
    try {
      const query = `${hospitalForm.address}, ${hospitalForm.city}`.trim();
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setHospitalForm(prev => ({
          ...prev,
          latitude: data[0].lat,
          longitude: data[0].lon
        }));
        setMessage('Coordinates auto-filled successfully.');
      } else {
        setError('Could not find coordinates for this address.');
      }
    } catch {
      setError('Failed to fetch coordinates.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleReverseGeocode = async () => {
    if (!hospitalForm.latitude || !hospitalForm.longitude) {
      setError('Please enter latitude and longitude to auto-fill address.');
      return;
    }
    setIsGeocoding(true);
    setError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${hospitalForm.latitude}&lon=${hospitalForm.longitude}`);
      const data = await res.json();
      if (data && data.address) {
        setHospitalForm(prev => ({
          ...prev,
          address: (data.display_name || prev.address).slice(0, 250),
          city: (data.address.city || data.address.town || data.address.state || prev.city).slice(0, 80)
        }));
        setMessage('Address auto-filled successfully.');
      } else {
        setError('Could not find address for these coordinates.');
      }
    } catch {
      setError('Failed to fetch address.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setIsGeocoding(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setHospitalForm(prev => ({ ...prev, latitude: latitude.toString(), longitude: longitude.toString() }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            setHospitalForm(prev => ({
              ...prev,
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              address: (data.display_name || prev.address).slice(0, 250),
              city: (data.address.city || data.address.town || data.address.state || prev.city).slice(0, 80)
            }));
            setMessage("Location found and address auto-filled from device.");
          }
        } catch {
          setMessage("Location found (coordinates only).");
        } finally {
          setIsGeocoding(false);
        }
      },
      () => {
        setError("Unable to retrieve your location. Check browser permissions.");
        setIsGeocoding(false);
      }
    );
  };

  const handleRegisterHospital = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await registerHospital({
        ...hospitalForm,
        latitude: parseFloat(hospitalForm.latitude),
        longitude: parseFloat(hospitalForm.longitude),
        admin_email: adminEmail,
        admin_password: adminPassword
      });
      setMessage('Hospital registered successfully.');
      setHospitalForm({ name: '', address: '', city: '', contact: '', latitude: '', longitude: '', manager_username: '', manager_password: '' });
      await refresh();
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // Flatten Pydantic validation errors
          setError(detail.map((e: any) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', '));
        } else {
          setError(detail);
        }
      } else {
        setError('Failed to register hospital.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterDoctor = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalId) {
      setError("Please select a hospital first.");
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
      await adminRegisterDoctor({
        ...doctorForm,
        hospital_id: typeof selectedHospitalId === 'string' ? parseInt(selectedHospitalId) : selectedHospitalId,
        admin_email: adminEmail,
        admin_password: adminPassword,
        availability: defaultAvailability
      });
      setMessage('Doctor registered successfully.');
      setDoctorForm({ name: '', specialization: '', contact: '', username: '', password: '' });
      
      const res = await getDoctorsByHospital(typeof selectedHospitalId === 'string' ? parseInt(selectedHospitalId) : selectedHospitalId);
      setAdminDoctors(res.doctors);
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((e: any) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', '));
        } else {
          setError(detail);
        }
      } else {
        setError('Failed to register doctor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIN VIEW ---
  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-12 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Admin Login</h2>
          <p className="text-gray-400 text-sm mt-1">Login to access the full admin dashboard.</p>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>}

        <form onSubmit={handleLogin} className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder="admin@example.com"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder="••••••••"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
          </div>
          <button
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-medium disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {isLoading ? 'Please wait...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  // --- AUTHENTICATED ADMIN DASHBOARD ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
          <p className="text-gray-400 text-sm">Logged in as <span className="text-indigo-400">{adminEmail}</span></p>
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
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>}

      {/* Pending Manager Approvals */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserCheck size={18} />
            Pending Manager Approvals
          </h3>
          <button
            onClick={refreshPending}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {pendingManagers.length === 0 ? (
          <p className="text-sm text-gray-500">No pending manager requests.</p>
        ) : (
          <div className="space-y-2">
            {pendingManagers.map((mgr) => (
              <div key={mgr.email} className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
                <div>
                  <div className="text-white text-sm font-medium">{mgr.email}</div>
                  <div className="text-xs text-gray-400">Requested {new Date(mgr.created_at).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => handleApprove(mgr.email)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Update State Statistics */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <ShieldAlert size={18} />
          Update State Statistics
        </h3>
        <form className="grid grid-cols-1 md:grid-cols-5 gap-2" onSubmit={handleUpdateStats}>
          <input
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            placeholder="State name"
            value={form.state_name}
            onChange={(e) => setForm({ ...form, state_name: e.target.value })}
            required
          />
          <input
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            placeholder="Active cases"
            value={form.active_cases}
            onChange={(e) => setForm({ ...form, active_cases: e.target.value })}
            type="number"
            min={0}
            required
          />
          <input
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            placeholder="Deaths"
            value={form.deaths}
            onChange={(e) => setForm({ ...form, deaths: e.target.value })}
            type="number"
            min={0}
            required
          />
          <input
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            placeholder="Updated by"
            value={form.updated_by}
            onChange={(e) => setForm({ ...form, updated_by: e.target.value })}
            required
          />
          <button disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60 text-white py-2 cursor-pointer transition-colors">
            Update
          </button>
        </form>
      </section>

      {/* Admin Manage Fields */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Admin Manage Fields</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
            <div className="text-gray-400">State Name</div>
            <div className="text-white">{form.state_name || '-'}</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
            <div className="text-gray-400">Active Cases</div>
            <div className="text-white">{form.active_cases || '-'}</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
            <div className="text-gray-400">Deaths</div>
            <div className="text-white">{form.deaths || '-'}</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
            <div className="text-gray-400">Updated By</div>
            <div className="text-white">{form.updated_by || '-'}</div>
          </div>
        </div>
      </section>

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

      {/* Full Admin Stats Table */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-3">Admin View: Full State Statistics</h3>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="py-2">State</th>
              <th className="py-2">Active Cases</th>
              <th className="py-2">Deaths</th>
              <th className="py-2">Zone</th>
              <th className="py-2">Updated By</th>
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
                <td className="py-2">{state.updated_by}</td>
                <td className="py-2">{new Date(state.last_updated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Hospital Registration & View */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 size={18} />
            Register New Hospital
          </h3>
          <button type="button" onClick={handleUseMyLocation} disabled={isGeocoding} className="bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 border border-sky-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors">
            <Locate size={16} /> Use My Location
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleRegisterHospital}>
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white md:col-span-2" placeholder="Hospital Name" value={hospitalForm.name} onChange={(e) => setHospitalForm({...hospitalForm, name: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="City" value={hospitalForm.city} onChange={(e) => setHospitalForm({...hospitalForm, city: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Contact Details" value={hospitalForm.contact} onChange={(e) => setHospitalForm({...hospitalForm, contact: e.target.value})} required />
            
            <div className="flex md:col-span-2 gap-2">
              <input className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Full Address / Search Map" value={hospitalForm.address} onChange={(e) => setHospitalForm({...hospitalForm, address: e.target.value})} required onSubmit={(e) => e.preventDefault()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGeocode(); } }} />
              <button type="button" onClick={handleGeocode} disabled={isGeocoding} className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 px-3 rounded-lg flex items-center gap-1 text-sm font-medium transition-colors" title="Search map for Address">
                <Search size={16} /> <span className="hidden sm:inline">Search map</span>
              </button>
            </div>

            <div className="flex md:col-span-2 gap-2">
              <input className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Latitude (e.g. 10.8505)" type="number" step="any" value={hospitalForm.latitude} onChange={(e) => setHospitalForm({...hospitalForm, latitude: e.target.value})} required />
              <input className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Longitude (e.g. 76.2711)" type="number" step="any" value={hospitalForm.longitude} onChange={(e) => setHospitalForm({...hospitalForm, longitude: e.target.value})} required />
              <button type="button" onClick={handleReverseGeocode} disabled={isGeocoding} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 rounded-lg flex items-center gap-1 text-sm font-medium transition-colors" title="Get Address from Coordinates">
                <MapPin size={16} />
              </button>
            </div>

            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Manager Username" type="email" value={hospitalForm.manager_username} onChange={(e) => setHospitalForm({...hospitalForm, manager_username: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Manager Password" type="password" minLength={6} value={hospitalForm.manager_password} onChange={(e) => setHospitalForm({...hospitalForm, manager_password: e.target.value})} required />
            
            <button disabled={isLoading} className="md:col-span-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60 text-white py-2 flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2">
              <PlusCircle size={18} />
              Register Hospital
            </button>
          </form>

          <div className="h-[320px] bg-gray-800 border border-gray-700 rounded-xl overflow-hidden relative">
            <MapContainer center={[20.5937, 78.9629]} zoom={4} style={{ height: '100%', width: '100%', zIndex: 10 }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <MapEvents setHospitalForm={setHospitalForm} setIsGeocoding={setIsGeocoding} setError={setError} setMessage={setMessage} />
              <MapUpdater lat={parseFloat(hospitalForm.latitude)} lng={parseFloat(hospitalForm.longitude)} />
              {!isNaN(parseFloat(hospitalForm.latitude)) && !isNaN(parseFloat(hospitalForm.longitude)) && (
                <Marker position={[parseFloat(hospitalForm.latitude), parseFloat(hospitalForm.longitude)]} />
              )}
            </MapContainer>
            <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm text-xs text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 z-[1000] pointer-events-none">
              Click anywhere to set location
            </div>
          </div>
        </div>

        <h4 className="text-md font-semibold text-gray-300 mb-2">Registered Hospitals</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400">
                <th className="py-2">Name</th>
                <th className="py-2">City</th>
                <th className="py-2">Contact</th>
                <th className="py-2">Manager Username</th>
                <th className="py-2">Registered</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => (
                <tr key={h.id} className="border-b border-gray-800 text-gray-200">
                  <td className="py-2 font-medium">{h.name}</td>
                  <td className="py-2">{h.city}</td>
                  <td className="py-2">{h.contact}</td>
                  <td className="py-2 text-amber-400">{h.manager_username}</td>
                  <td className="py-2">{new Date(h.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {hospitals.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">No hospitals registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Admin Doctor Registration & View */}
      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Stethoscope size={18} />
          Register Doctor
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Select Hospital</label>
          <select 
            className="w-full md:w-1/2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value ? parseInt(e.target.value) : '')}
          >
            <option value="">-- Choose a Hospital --</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name} (City: {h.city})</option>
            ))}
          </select>
        </div>

        {selectedHospitalId && (
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6" onSubmit={handleRegisterDoctor}>
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Dr. XYZ (Name)" value={doctorForm.name} onChange={(e) => setDoctorForm({...doctorForm, name: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Specialization (e.g. Virologist)" value={doctorForm.specialization} onChange={(e) => setDoctorForm({...doctorForm, specialization: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Contact Details" value={doctorForm.contact} onChange={(e) => setDoctorForm({...doctorForm, contact: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Doctor Username" value={doctorForm.username} onChange={(e) => setDoctorForm({...doctorForm, username: e.target.value})} required />
            <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Doctor Password" type="password" minLength={6} value={doctorForm.password} onChange={(e) => setDoctorForm({...doctorForm, password: e.target.value})} required />
            <button disabled={isLoading} className="lg:col-span-5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60 text-white py-2 flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <PlusCircle size={18} />
              Register Doctor (Standard 9-5 Schedule)
            </button>
          </form>
        )}

        {selectedHospitalId && (
          <>
            <h4 className="text-md font-semibold text-gray-300 mb-2">Registered Doctors at Selected Hospital</h4>
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
                  {adminDoctors.map((d) => (
                    <tr key={d.id} className="border-b border-gray-800 text-gray-200">
                      <td className="py-2 font-medium">{d.name}</td>
                      <td className="py-2">{d.specialization}</td>
                      <td className="py-2">{d.contact}</td>
                      <td className="py-2">{d.username}</td>
                      <td className="py-2">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {adminDoctors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500">No doctors registered here yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
