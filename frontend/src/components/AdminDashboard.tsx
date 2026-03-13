import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, AlertOctagon, CircleCheckBig, Flame, ShieldAlert } from 'lucide-react';
import {
  authLogin,
  getStateStats,
  getZoneSummary,
  upsertStateStats,
  type StateStat,
  type ZoneSummary,
} from '../services/api';

type UserRole = 'patient' | 'manager' | 'admin';

function zoneStyles(zone: 'Red' | 'Orange' | 'Green') {
  if (zone === 'Red') {
    return 'bg-red-500/15 border-red-500/40 text-red-300';
  }
  if (zone === 'Orange') {
    return 'bg-orange-500/15 border-orange-500/40 text-orange-300';
  }
  return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
}

export default function AdminDashboard() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const [states, setStates] = useState<StateStat[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);

  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authenticatedRole, setAuthenticatedRole] = useState<'manager' | 'admin' | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState('');

  const [form, setForm] = useState({
    state_name: '',
    active_cases: '',
    deaths: '',
    updated_by: 'admin',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const roleNeedsAuth = selectedRole === 'manager' || selectedRole === 'admin';
  const isRoleAuthenticated = !roleNeedsAuth || authenticatedRole === selectedRole;

  const maxCases = useMemo(() => Math.max(1, ...states.map((s) => s.active_cases)), [states]);

  const refresh = async () => {
    setError('');
    try {
      const [stateRes, summaryRes] = await Promise.all([getStateStats(), getZoneSummary()]);
      setStates(stateRes.states);
      setSummary(summaryRes);
    } catch {
      setError('Failed to load dashboard data.');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedRole || selectedRole === 'patient') {
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await authLogin({ role: selectedRole, email: authForm.email, password: authForm.password });
      setAuthenticatedRole(selectedRole);
      setAuthUserEmail(authForm.email);
      setMessage(`${selectedRole} login successful.`);
    } catch {
      setError('Login failed. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
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

  const summaryCards = (
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
        <div className="text-sky-200 text-sm mb-1 flex items-center gap-2"><Activity size={16} />Total Active Cases</div>
        <div className="text-2xl font-bold text-white">{summary?.total_active_cases ?? 0}</div>
      </div>
    </section>
  );

  const zoneCharts = (
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
                  state.zone === 'Red'
                    ? 'bg-red-500'
                    : state.zone === 'Orange'
                    ? 'bg-orange-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${(state.active_cases / maxCases) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 overflow-y-auto max-h-[calc(100vh-8rem)] space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Admin Dashboard and Red Zone Monitoring</h2>
        <p className="text-gray-400 text-sm">
          Choose role first. Patient sees public fields, Manager sees manager fields, Admin manages full data.
        </p>
      </div>

      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Who are you?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { key: 'patient', label: 'Patient', desc: 'View public zone and state information' },
            { key: 'manager', label: 'Manager', desc: 'Login and monitor operational fields' },
            { key: 'admin', label: 'Admin', desc: 'Login and manage state statistics' },
          ] as const).map((role) => (
            <button
              key={role.key}
              onClick={() => {
                setSelectedRole(role.key);
                setError('');
                setMessage('');
                if (role.key !== 'patient' && authenticatedRole !== role.key) {
                  setAuthForm({ email: '', password: '' });
                }
              }}
              className={`text-left p-4 rounded-xl border transition-colors ${
                selectedRole === role.key
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
              }`}
            >
              <div className="text-white font-semibold">{role.label}</div>
              <div className="text-xs text-gray-400 mt-1">{role.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {message && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm">{message}</div>}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>}

      {!selectedRole && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-sm">
          Select Patient, Manager, or Admin to continue.
        </div>
      )}

      {roleNeedsAuth && !isRoleAuthenticated && (
        <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 max-w-xl mx-auto">
          <h3 className="text-lg font-semibold text-white mb-2">
            {selectedRole === 'admin' ? 'Admin Login' : 'Manager Login'}
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Login is required to view {selectedRole} monitoring fields.
          </p>
          <form onSubmit={handleAuthSubmit} className="space-y-2">
            <input
              type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
            />
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
            <button
              disabled={isLoading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60"
            >
              Login
            </button>
          </form>
        </section>
      )}

      {roleNeedsAuth && isRoleAuthenticated && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm">
          Authenticated as {authUserEmail} ({selectedRole})
        </div>
      )}

      {selectedRole === 'patient' && (
        <>
          {summaryCards}
          {zoneCharts}
          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-3">Patient View: State Statistics</h3>
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
                  <tr key={`${state.state_name}-patient-row`} className="border-b border-gray-800 text-gray-200">
                    <td className="py-2">{state.state_name}</td>
                    <td className="py-2">{state.active_cases}</td>
                    <td className="py-2">{state.deaths}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-md border text-xs ${zoneStyles(state.zone)}`}>
                        {state.zone}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {selectedRole === 'manager' && isRoleAuthenticated && (
        <>
          {summaryCards}
          {zoneCharts}
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
                  <tr key={`${state.state_name}-manager-row`} className="border-b border-gray-800 text-gray-200">
                    <td className="py-2">{state.state_name}</td>
                    <td className="py-2">{state.active_cases}</td>
                    <td className="py-2">{state.deaths}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-md border text-xs ${zoneStyles(state.zone)}`}>
                        {state.zone}
                      </span>
                    </td>
                    <td className="py-2">{new Date(state.last_updated).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {selectedRole === 'admin' && isRoleAuthenticated && (
        <>
          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldAlert size={18} />
              Admin: Update State Statistics
            </h3>
            <form className="grid grid-cols-1 md:grid-cols-5 gap-2" onSubmit={handleSubmit}>
              <input
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                placeholder="State name"
                value={form.state_name}
                onChange={(e) => setForm({ ...form, state_name: e.target.value })}
                required
              />
              <input
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                placeholder="Active cases"
                value={form.active_cases}
                onChange={(e) => setForm({ ...form, active_cases: e.target.value })}
                type="number"
                min={0}
                required
              />
              <input
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                placeholder="Deaths"
                value={form.deaths}
                onChange={(e) => setForm({ ...form, deaths: e.target.value })}
                type="number"
                min={0}
                required
              />
              <input
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                placeholder="Updated by"
                value={form.updated_by}
                onChange={(e) => setForm({ ...form, updated_by: e.target.value })}
                required
              />
              <button disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60">
                Update
              </button>
            </form>
          </section>

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

          {summaryCards}
          {zoneCharts}

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
                  <tr key={`${state.state_name}-admin-row`} className="border-b border-gray-800 text-gray-200">
                    <td className="py-2">{state.state_name}</td>
                    <td className="py-2">{state.active_cases}</td>
                    <td className="py-2">{state.deaths}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-md border text-xs ${zoneStyles(state.zone)}`}>
                        {state.zone}
                      </span>
                    </td>
                    <td className="py-2">{state.updated_by}</td>
                    <td className="py-2">{new Date(state.last_updated).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
