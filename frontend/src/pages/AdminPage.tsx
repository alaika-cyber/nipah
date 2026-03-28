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
} from 'lucide-react';
import {
  authLogin,
  getStateStats,
  getZoneSummary,
  upsertStateStats,
  getPendingManagerRequests,
  approveManagerRequest,
  type StateStat,
  type ZoneSummary,
  type PendingManagerRequest,
} from '../services/api';

function zoneStyles(zone: 'Red' | 'Orange' | 'Green') {
  if (zone === 'Red') return 'bg-red-500/15 border-red-500/40 text-red-300';
  if (zone === 'Orange') return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const [stateRes, summaryRes] = await Promise.all([getStateStats(), getZoneSummary()]);
      setStates(stateRes.states);
      setSummary(summaryRes);
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
    </div>
  );
}
