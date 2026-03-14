import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarPlus, Hospital, MapPinned, Search, Stethoscope, UserRoundCog } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  approveManagerRequest,
  authLogin,
  authSignup,
  bookAppointment,
  getDoctorSlots,
  getDoctorsByHospital,
  getHospitals,
  getManagerAppointments,
  getPendingManagerRequests,
  registerDoctor,
  registerHospital,
  type Appointment,
  type Doctor,
  type Hospital as HospitalType,
} from '../services/api';

type LatLngTuple = [number, number];

const DEFAULT_MAP_CENTER: LatLngTuple = [20.5937, 78.9629];
const DEFAULT_MAP_ZOOM = 5;

function isValidCoord(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function toCoordString(value: number): string {
  return value.toFixed(6);
}

function RecenterMap({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
}

function LocationPickerMap({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const hasSelected = latitude !== null && longitude !== null && isValidCoord(latitude, longitude);
  const center: LatLngTuple = hasSelected ? [latitude, longitude] : DEFAULT_MAP_CENTER;
  const zoom = hasSelected ? 13 : DEFAULT_MAP_ZOOM;

  function ClickHandler() {
    useMapEvents({
      click(event) {
        onPick(event.latlng.lat, event.latlng.lng);
      },
    });
    return null;
  }

  return (
    <MapContainer center={center} zoom={zoom} className="h-56 w-full rounded-lg border border-gray-700">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} zoom={zoom} />
      <ClickHandler />
      {hasSelected && (
        <CircleMarker center={[latitude, longitude]} radius={8} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.8 }}>
          <Popup>
            Selected location
            <br />
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}

function HospitalDiscoveryMap({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
}: {
  hospitals: HospitalType[];
  selectedHospitalId: number | null;
  onSelectHospital: (hospitalId: number) => void;
}) {
  const selectedHospital = hospitals.find((hospital) => hospital.id === selectedHospitalId) ?? null;
  const center: LatLngTuple =
    selectedHospital && isValidCoord(selectedHospital.latitude, selectedHospital.longitude)
      ? [selectedHospital.latitude, selectedHospital.longitude]
      : hospitals.length > 0 && isValidCoord(hospitals[0].latitude, hospitals[0].longitude)
      ? [hospitals[0].latitude, hospitals[0].longitude]
      : DEFAULT_MAP_CENTER;

  const zoom = selectedHospital ? 12 : DEFAULT_MAP_ZOOM;

  return (
    <MapContainer center={center} zoom={zoom} className="h-56 w-full rounded-lg border border-gray-700">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} zoom={zoom} />
      {hospitals
        .filter((hospital) => isValidCoord(hospital.latitude, hospital.longitude))
        .map((hospital) => {
          const active = hospital.id === selectedHospitalId;
          return (
            <CircleMarker
              key={hospital.id}
              center={[hospital.latitude, hospital.longitude]}
              radius={active ? 10 : 7}
              pathOptions={{
                color: active ? '#22c55e' : '#6366f1',
                fillColor: active ? '#22c55e' : '#6366f1',
                fillOpacity: 0.85,
              }}
              eventHandlers={{ click: () => onSelectHospital(hospital.id) }}
            >
              <Popup>
                <strong>{hospital.name}</strong>
                <br />
                {hospital.address}, {hospital.city}
                <br />
                {hospital.contact}
                <br />
                <button
                  type="button"
                  className="mt-2 rounded bg-indigo-600 px-2 py-1 text-xs text-white"
                  onClick={() => onSelectHospital(hospital.id)}
                >
                  Select Hospital
                </button>
              </Popup>
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
}

type UserRole = 'patient' | 'manager' | 'admin';

const DEFAULT_AVAILABILITY = JSON.stringify(
  {
    Monday: ['10:00', '11:00', '14:00'],
    Tuesday: ['10:00', '11:00', '14:00'],
    Wednesday: ['10:00', '11:00', '14:00'],
    Thursday: ['10:00', '11:00', '14:00'],
    Friday: ['10:00', '11:00', '14:00'],
  },
  null,
  2
);

export default function HospitalBooking() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authenticatedRole, setAuthenticatedRole] = useState<'manager' | 'admin' | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState('');
  const [authUserPassword, setAuthUserPassword] = useState('');
  const [pendingManagers, setPendingManagers] = useState<Array<{ email: string; status: string; created_at: string }>>([]);

  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [managerAppointments, setManagerAppointments] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const [cityFilter, setCityFilter] = useState('');
  const [nearbyLat, setNearbyLat] = useState('');
  const [nearbyLng, setNearbyLng] = useState('');
  const [nearbyRadius, setNearbyRadius] = useState('25');

  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  const [managerUsernameLookup, setManagerUsernameLookup] = useState('');

  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    address: '',
    city: '',
    contact: '',
    latitude: '',
    longitude: '',
    manager_username: '',
    manager_password: '',
  });

  const [managerHospitalForm, setManagerHospitalForm] = useState({
    name: '',
    address: '',
    city: '',
    contact: '',
    latitude: '',
    longitude: '',
    manager_username: '',
    manager_password: '',
  });

  const [doctorForm, setDoctorForm] = useState({
    hospital_id: '',
    manager_username: '',
    name: '',
    specialization: '',
    contact: '',
    availability: DEFAULT_AVAILABILITY,
    username: '',
    password: '',
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patient_name: '',
    patient_contact: '',
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.id === selectedHospitalId) ?? null,
    [hospitals, selectedHospitalId]
  );

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId]
  );

  const roleNeedsAuth = selectedRole === 'manager' || selectedRole === 'admin';
  const isRoleAuthenticated = !roleNeedsAuth || authenticatedRole === selectedRole;

  const fetchHospitals = async () => {
    setError('');
    try {
      const params: {
        city?: string;
        latitude?: number;
        longitude?: number;
        radius_km?: number;
      } = {};

      if (cityFilter.trim()) {
        params.city = cityFilter.trim();
      }

      const lat = Number.parseFloat(nearbyLat);
      const lng = Number.parseFloat(nearbyLng);
      const radius = Number.parseFloat(nearbyRadius);

      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        params.latitude = lat;
        params.longitude = lng;
      }
      if (!Number.isNaN(radius)) {
        params.radius_km = radius;
      }

      const response = await getHospitals(params);
      setHospitals(response.hospitals);
    } catch {
      setError('Failed to load hospitals.');
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const loadDoctors = async (hospitalId: number) => {
    try {
      const response = await getDoctorsByHospital(hospitalId);
      setDoctors(response.doctors);
    } catch {
      setDoctors([]);
      setError('Failed to load doctors for selected hospital.');
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!roleNeedsAuth || !selectedRole) {
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const payload = {
        role: selectedRole,
        email: authForm.email,
        password: authForm.password,
      };

      if (authMode === 'login') {
        await authLogin(payload);
        setAuthenticatedRole(selectedRole);
        setAuthUserEmail(authForm.email);
        setAuthUserPassword(authForm.password);
        setMessage(`${selectedRole} login successful.`);

        if (selectedRole === 'manager') {
          setManagerHospitalForm((prev) => ({
            ...prev,
            manager_username: prev.manager_username || authForm.email,
            manager_password: prev.manager_password || authForm.password,
          }));
        }

        if (selectedRole === 'admin') {
          const pending = await getPendingManagerRequests(authForm.email, authForm.password);
          setPendingManagers(pending.pending_requests);
        }
      } else {
        await authSignup(payload);
        setMessage('Manager signup request sent. Wait for admin approval, then login.');
        setAuthMode('login');
      }
    } catch {
      setError(`${authMode === 'login' ? 'Login' : 'Signup'} failed. Check credentials or approval status.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterHospital = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await registerHospital({
        ...hospitalForm,
        latitude: Number.parseFloat(hospitalForm.latitude),
        longitude: Number.parseFloat(hospitalForm.longitude),
      });
      setMessage('Hospital registered successfully.');
      setHospitalForm({
        name: '',
        address: '',
        city: '',
        contact: '',
        latitude: '',
        longitude: '',
        manager_username: '',
        manager_password: '',
      });
      await fetchHospitals();
    } catch {
      setError('Hospital registration failed. Ensure manager username is unique.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterDoctor = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const availability = JSON.parse(doctorForm.availability) as Record<string, string[]>;
      await registerDoctor({
        hospital_id: Number.parseInt(doctorForm.hospital_id, 10),
        manager_username: doctorForm.manager_username,
        name: doctorForm.name,
        specialization: doctorForm.specialization,
        contact: doctorForm.contact,
        availability,
        username: doctorForm.username,
        password: doctorForm.password,
      });
      setMessage('Doctor registered successfully.');
      setDoctorForm({
        hospital_id: '',
        manager_username: '',
        name: '',
        specialization: '',
        contact: '',
        availability: DEFAULT_AVAILABILITY,
        username: '',
        password: '',
      });
    } catch {
      setError('Doctor registration failed. Check JSON availability and manager details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterHospitalForManager = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await registerHospital({
        ...managerHospitalForm,
        latitude: Number.parseFloat(managerHospitalForm.latitude),
        longitude: Number.parseFloat(managerHospitalForm.longitude),
      });
      setMessage('Hospital registered successfully.');
      setManagerHospitalForm((prev) => ({
        name: '',
        address: '',
        city: '',
        contact: '',
        latitude: '',
        longitude: '',
        manager_username: prev.manager_username,
        manager_password: prev.manager_password,
      }));
      await fetchHospitals();
    } catch {
      setError('Hospital registration failed. Ensure manager username is unique.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyCurrentLocation = (target: 'patient' | 'admin' | 'manager') => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = toCoordString(position.coords.latitude);
        const longitude = toCoordString(position.coords.longitude);

        if (target === 'patient') {
          setNearbyLat(latitude);
          setNearbyLng(longitude);
        }

        if (target === 'admin') {
          setHospitalForm((prev) => ({ ...prev, latitude, longitude }));
        }

        if (target === 'manager') {
          setManagerHospitalForm((prev) => ({ ...prev, latitude, longitude }));
        }
      },
      () => {
        setError('Unable to access your current location. Please allow location permission.');
      }
    );
  };

  const handleFetchSlots = async () => {
    if (!selectedDoctorId || !selectedDate) {
      setError('Select a doctor and appointment date first.');
      return;
    }
    setError('');
    try {
      const response = await getDoctorSlots(selectedDoctorId, selectedDate);
      setAvailableSlots(response.available_slots);
      if (!response.available_slots.includes(selectedSlot)) {
        setSelectedSlot('');
      }
    } catch {
      setError('Could not fetch available slots.');
      setAvailableSlots([]);
    }
  };

  const handleBookAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalId || !selectedDoctorId || !selectedDate || !selectedSlot) {
      setError('Select hospital, doctor, date, and slot before booking.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await bookAppointment({
        patient_name: appointmentForm.patient_name,
        patient_contact: appointmentForm.patient_contact,
        notes: appointmentForm.notes || undefined,
        hospital_id: selectedHospitalId,
        doctor_id: selectedDoctorId,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
      });
      setMessage('Appointment booked successfully.');
      setAppointmentForm({ patient_name: '', patient_contact: '', notes: '' });
      setSelectedSlot('');
      await handleFetchSlots();
    } catch {
      setError('Booking failed. Slot may already be booked.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewManagerAppointments = async () => {
    if (!managerUsernameLookup.trim()) {
      setError('Enter manager username to view appointments.');
      return;
    }
    setError('');
    try {
      const response = await getManagerAppointments(managerUsernameLookup.trim());
      setManagerAppointments(response.appointments);
    } catch {
      setError('Failed to fetch manager appointments.');
      setManagerAppointments([]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 overflow-y-auto max-h-[calc(100vh-8rem)] space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Hospital Discovery and Appointment Booking</h2>
        <p className="text-gray-400 text-sm">
          First choose your role, then the system shows only your relevant parameters and values.
        </p>
      </div>

      <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Who are you?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { key: 'patient', label: 'Patient', desc: 'Discover hospitals and book appointments' },
            { key: 'manager', label: 'Manager', desc: 'Register doctors and view appointments' },
            { key: 'admin', label: 'Admin', desc: 'Login + approve manager requests' },
          ] as const).map((role) => (
            <button
              key={role.key}
              onClick={() => {
                setSelectedRole(role.key);
                setError('');
                setMessage('');
                if (role.key === 'admin') {
                  setAuthMode('login');
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
            {selectedRole === 'admin' ? 'Admin Login' : `Manager ${authMode === 'login' ? 'Login' : 'Sign Up'}`}
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Public users cannot access {selectedRole} values/parameters without authentication.
          </p>

          {selectedRole === 'manager' && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setAuthMode('login')}
                className={`px-3 py-1.5 rounded-lg text-sm ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`px-3 py-1.5 rounded-lg text-sm ${authMode === 'signup' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                Sign Up Request
              </button>
            </div>
          )}

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
              {selectedRole === 'admin' || authMode === 'login' ? 'Login' : 'Create Signup Request'}
            </button>
          </form>

          <div className="mt-3 text-xs text-gray-500">
            Default credentials are seeded from backend environment variables.
          </div>
        </section>
      )}

      {roleNeedsAuth && isRoleAuthenticated && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm">
          Authenticated as {authUserEmail} ({selectedRole})
        </div>
      )}

      {selectedRole === 'admin' && isRoleAuthenticated && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 xl:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-3">Admin: Manager Signup Requests</h3>
            <div className="space-y-2">
              {pendingManagers.length === 0 && (
                <p className="text-sm text-gray-400">No pending manager requests.</p>
              )}

              {pendingManagers.map((req) => (
                <div key={req.email} className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                  <div>
                    <div className="text-white text-sm">{req.email}</div>
                    <div className="text-xs text-gray-400">Requested at: {new Date(req.created_at).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={async () => {
                      setError('');
                      setMessage('');
                      try {
                        await approveManagerRequest(authUserEmail, authUserPassword, req.email);
                        const pending = await getPendingManagerRequests(authUserEmail, authUserPassword);
                        setPendingManagers(pending.pending_requests);
                        setMessage(`Approved manager: ${req.email}`);
                      } catch {
                        setError('Failed to approve manager request.');
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Hospital size={18} />
              Admin: Register Hospital
            </h3>
            <form className="space-y-2" onSubmit={handleRegisterHospital}>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Hospital name" value={hospitalForm.name} onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })} required />
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Address" value={hospitalForm.address} onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="City" value={hospitalForm.city} onChange={(e) => setHospitalForm({ ...hospitalForm, city: e.target.value })} required />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Contact" value={hospitalForm.contact} onChange={(e) => setHospitalForm({ ...hospitalForm, contact: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Latitude" value={hospitalForm.latitude} onChange={(e) => setHospitalForm({ ...hospitalForm, latitude: e.target.value })} required type="number" step="0.000001" />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Longitude" value={hospitalForm.longitude} onChange={(e) => setHospitalForm({ ...hospitalForm, longitude: e.target.value })} required type="number" step="0.000001" />
              </div>
              <button
                type="button"
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 rounded-lg font-medium"
                onClick={() => applyCurrentLocation('admin')}
              >
                Use Current Location
              </button>
              <LocationPickerMap
                latitude={Number.isFinite(Number.parseFloat(hospitalForm.latitude)) ? Number.parseFloat(hospitalForm.latitude) : null}
                longitude={Number.isFinite(Number.parseFloat(hospitalForm.longitude)) ? Number.parseFloat(hospitalForm.longitude) : null}
                onPick={(lat, lng) =>
                  setHospitalForm((prev) => ({
                    ...prev,
                    latitude: toCoordString(lat),
                    longitude: toCoordString(lng),
                  }))
                }
              />
              <p className="text-xs text-gray-400">Click on the map to set hospital latitude and longitude.</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Manager username" value={hospitalForm.manager_username} onChange={(e) => setHospitalForm({ ...hospitalForm, manager_username: e.target.value })} required />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Manager password" value={hospitalForm.manager_password} onChange={(e) => setHospitalForm({ ...hospitalForm, manager_password: e.target.value })} required type="password" />
              </div>
              <button disabled={isLoading} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60">
                Save Hospital
              </button>
            </form>
          </section>

          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Admin Parameters and Values</h3>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Hospital Name</div>
                <div className="text-white">{hospitalForm.name || '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">City</div>
                <div className="text-white">{hospitalForm.city || '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Manager Username</div>
                <div className="text-white">{hospitalForm.manager_username || '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Coordinates</div>
                <div className="text-white">{hospitalForm.latitude || '-'}, {hospitalForm.longitude || '-'}</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedRole === 'manager' && isRoleAuthenticated && (
        <>
          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Hospital size={18} />
              Manager: Register Hospital
            </h3>
            <form className="space-y-2" onSubmit={handleRegisterHospitalForManager}>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Hospital name" value={managerHospitalForm.name} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, name: e.target.value })} required />
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Address" value={managerHospitalForm.address} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, address: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="City" value={managerHospitalForm.city} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, city: e.target.value })} required />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Contact" value={managerHospitalForm.contact} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, contact: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Latitude" value={managerHospitalForm.latitude} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, latitude: e.target.value })} required type="number" step="0.000001" />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Longitude" value={managerHospitalForm.longitude} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, longitude: e.target.value })} required type="number" step="0.000001" />
              </div>
              <button
                type="button"
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 rounded-lg font-medium"
                onClick={() => applyCurrentLocation('manager')}
              >
                Use Current Location
              </button>
              <LocationPickerMap
                latitude={Number.isFinite(Number.parseFloat(managerHospitalForm.latitude)) ? Number.parseFloat(managerHospitalForm.latitude) : null}
                longitude={Number.isFinite(Number.parseFloat(managerHospitalForm.longitude)) ? Number.parseFloat(managerHospitalForm.longitude) : null}
                onPick={(lat, lng) =>
                  setManagerHospitalForm((prev) => ({
                    ...prev,
                    latitude: toCoordString(lat),
                    longitude: toCoordString(lng),
                  }))
                }
              />
              <p className="text-xs text-gray-400">Click on the map to set hospital latitude and longitude.</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Manager username" value={managerHospitalForm.manager_username} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, manager_username: e.target.value })} required />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Manager password" value={managerHospitalForm.manager_password} onChange={(e) => setManagerHospitalForm({ ...managerHospitalForm, manager_password: e.target.value })} required type="password" />
              </div>
              <button disabled={isLoading} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60">
                Save Hospital
              </button>
            </form>
          </section>

          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <UserRoundCog size={18} />
              Manager: Register Doctor
            </h3>
            <form className="space-y-2" onSubmit={handleRegisterDoctor}>
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Hospital ID" value={doctorForm.hospital_id} onChange={(e) => setDoctorForm({ ...doctorForm, hospital_id: e.target.value })} required type="number" min={1} />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Manager username" value={doctorForm.manager_username} onChange={(e) => setDoctorForm({ ...doctorForm, manager_username: e.target.value })} required />
              </div>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Doctor name" value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Specialization" value={doctorForm.specialization} onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })} required />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Contact" value={doctorForm.contact} onChange={(e) => setDoctorForm({ ...doctorForm, contact: e.target.value })} required />
              </div>
              <textarea className="w-full h-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs" value={doctorForm.availability} onChange={(e) => setDoctorForm({ ...doctorForm, availability: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Doctor username" value={doctorForm.username} onChange={(e) => setDoctorForm({ ...doctorForm, username: e.target.value })} required />
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Doctor password" value={doctorForm.password} onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })} required type="password" />
              </div>
              <button disabled={isLoading} className="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium disabled:opacity-60">
                Save Doctor
              </button>
            </form>
          </section>

          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white">Manager Parameters and Values</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Hospital ID</div>
                <div className="text-white">{doctorForm.hospital_id || '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Doctor Name</div>
                <div className="text-white">{doctorForm.name || '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Specialization</div>
                <div className="text-white">{doctorForm.specialization || '-'}</div>
              </div>
            </div>
          </section>

          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Stethoscope size={18} />
              Manager: View Appointments
            </h3>
            <div className="flex gap-2">
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Manager username" value={managerUsernameLookup} onChange={(e) => setManagerUsernameLookup(e.target.value)} />
              <button onClick={handleViewManagerAppointments} className="px-4 bg-amber-600 hover:bg-amber-500 rounded-lg">Load</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="py-2">Patient</th>
                    <th className="py-2">Doctor</th>
                    <th className="py-2">Hospital</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Time</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {managerAppointments.map((appt) => (
                    <tr key={appt.id} className="border-b border-gray-800 text-gray-200">
                      <td className="py-2">{appt.patient_name}</td>
                      <td className="py-2">{appt.doctor_name}</td>
                      <td className="py-2">{appt.hospital_name}</td>
                      <td className="py-2">{appt.appointment_date}</td>
                      <td className="py-2">{appt.appointment_time}</td>
                      <td className="py-2 capitalize">{appt.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {managerAppointments.length === 0 && <p className="text-sm text-gray-500 mt-2">No appointments to show.</p>}
            </div>
          </section>
        </>
      )}

      {selectedRole === 'patient' && (
        <>
          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Search size={18} />
              Patient: Discover Hospitals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Filter by city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
              <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="My latitude" value={nearbyLat} onChange={(e) => setNearbyLat(e.target.value)} type="number" step="0.000001" />
              <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="My longitude" value={nearbyLng} onChange={(e) => setNearbyLng(e.target.value)} type="number" step="0.000001" />
              <div className="flex gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Radius km" value={nearbyRadius} onChange={(e) => setNearbyRadius(e.target.value)} type="number" min={1} />
                <button onClick={fetchHospitals} className="px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg">Go</button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm"
                onClick={() => applyCurrentLocation('patient')}
              >
                Use My Current Location
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {hospitals.map((hospital) => (
                  <button
                    key={hospital.id}
                    onClick={() => {
                      setSelectedHospitalId(hospital.id);
                      setSelectedDoctorId(null);
                      setAvailableSlots([]);
                      setSelectedSlot('');
                      loadDoctors(hospital.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedHospitalId === hospital.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-700 bg-gray-800/60 hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-semibold text-white">{hospital.name}</div>
                    <div className="text-xs text-gray-400">{hospital.address}, {hospital.city}</div>
                    <div className="text-xs text-gray-500">{hospital.contact}</div>
                    {typeof hospital.distance_km === 'number' && (
                      <div className="text-xs text-teal-300 mt-1">{hospital.distance_km} km away</div>
                    )}
                  </button>
                ))}
                {hospitals.length === 0 && <p className="text-sm text-gray-500">No hospitals found.</p>}
              </div>

              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-3">
                <div className="flex items-center gap-2 text-white font-medium mb-2">
                  <MapPinned size={16} />
                  Map View
                </div>
                <HospitalDiscoveryMap
                  hospitals={hospitals}
                  selectedHospitalId={selectedHospitalId}
                  onSelectHospital={(hospitalId) => {
                    setSelectedHospitalId(hospitalId);
                    setSelectedDoctorId(null);
                    setAvailableSlots([]);
                    setSelectedSlot('');
                    loadDoctors(hospitalId);
                  }}
                />
                {selectedHospital ? (
                  <a
                    className="text-sm text-indigo-300 hover:text-indigo-200 mt-2 inline-block"
                    href={`https://www.openstreetmap.org/?mlat=${selectedHospital.latitude}&mlon=${selectedHospital.longitude}#map=13/${selectedHospital.latitude}/${selectedHospital.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open full map for {selectedHospital.name}
                  </a>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">Select a hospital from list or map marker.</p>
                )}
              </div>
            </div>
          </section>

          <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarPlus size={18} />
              Patient: Book Appointment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                value={selectedHospitalId ?? ''}
                onChange={(e) => {
                  const nextHospitalId = Number.parseInt(e.target.value, 10);
                  if (Number.isNaN(nextHospitalId)) {
                    setSelectedHospitalId(null);
                    setDoctors([]);
                    return;
                  }
                  setSelectedHospitalId(nextHospitalId);
                  setSelectedDoctorId(null);
                  setSelectedSlot('');
                  setAvailableSlots([]);
                  loadDoctors(nextHospitalId);
                }}
              >
                <option value="">Select hospital</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>

              <select
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                value={selectedDoctorId ?? ''}
                onChange={(e) => {
                  const nextDoctorId = Number.parseInt(e.target.value, 10);
                  if (Number.isNaN(nextDoctorId)) {
                    setSelectedDoctorId(null);
                    return;
                  }
                  setSelectedDoctorId(nextDoctorId);
                  setSelectedSlot('');
                }}
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                ))}
              </select>

              <div className="flex gap-2">
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                <button onClick={handleFetchSlots} className="px-4 bg-teal-600 hover:bg-teal-500 rounded-lg">Slots</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${selectedSlot === slot ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-300'}`}
                >
                  {slot}
                </button>
              ))}
              {availableSlots.length === 0 && <span className="text-sm text-gray-500">No slots loaded.</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Selected Hospital</div>
                <div className="text-white">{selectedHospital?.name || '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Selected Doctor</div>
                <div className="text-white">{selectedDoctor ? `${selectedDoctor.name} (${selectedDoctor.specialization})` : '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Selected Date</div>
                <div className="text-white">{selectedDate || '-'}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400">Selected Slot</div>
                <div className="text-white">{selectedSlot || '-'}</div>
              </div>
            </div>

            <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Patient name" value={appointmentForm.patient_name} onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_name: e.target.value })} required />
              <input className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Patient contact" value={appointmentForm.patient_contact} onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_contact: e.target.value })} required />
              <button disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium disabled:opacity-60">Confirm Booking</button>
              <textarea className="md:col-span-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" placeholder="Notes (optional)" value={appointmentForm.notes} onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} />
            </form>
          </section>
        </>
      )}
    </div>
  );
}
