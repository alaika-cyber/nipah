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
  hospitalLogin,
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

type UserRole = 'patient' | 'manager' | 'admin' | 'hospital';

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
  const [authenticatedRole, setAuthenticatedRole] = useState<'manager' | 'admin' | 'hospital' | null>(null);
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

  const roleNeedsAuth = selectedRole === 'manager' || selectedRole === 'admin' || selectedRole === 'hospital';
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
      if (selectedRole === 'hospital') {
        if (authMode === 'login') {
          await hospitalLogin({ username: authForm.email, password: authForm.password });
          setAuthenticatedRole('hospital');
          setAuthUserEmail(authForm.email);
          setAuthUserPassword(authForm.password);
          setMessage('Hospital manager login successful.');
          setManagerUsernameLookup(authForm.email);
        } else {
          setError('Hospital managers must be registered by an Admin.');
        }
        setIsLoading(false);
        return;
      }

      const payload = {
        role: selectedRole as 'admin' | 'manager',
        email: authForm.email,
        password: authForm.password,
      };

      if (authMode === 'login') {
        await authLogin(payload);
        setAuthenticatedRole(selectedRole as 'admin' | 'manager');
        setAuthUserEmail(authForm.email);
        setAuthUserPassword(authForm.password);
        setMessage(`${selectedRole} login successful.`);

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
        admin_email: authUserEmail,
        admin_password: authUserPassword,
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
        manager_username: authUserEmail,
        manager_password: authUserPassword,
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
        admin_email: '', // This will fail if not admin, correctly.
        admin_password: '',
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
    try {
      const response = await getManagerAppointments({
        manager_username: authUserEmail,
        manager_password: authUserPassword,
      });
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
            { key: 'hospital', label: 'Hospital', desc: 'Manage doctors and view appointments' },
            { key: 'manager', label: 'Monitoring', desc: 'Access risk monitoring dashboard' },
            { key: 'admin', label: 'Admin', desc: 'Register hospitals and approve managers' },
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

      {selectedRole === 'hospital' && isRoleAuthenticated && (
        <section className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserRoundCog size={18} />
              Hospital Manager: {authUserEmail}
            </h3>
            <button
              onClick={handleViewManagerAppointments}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white"
            >
              Refresh Appointments
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-200">Register New Doctor</h4>
              <form onSubmit={handleRegisterDoctor} className="space-y-2">
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                  placeholder="Hospital ID"
                  value={doctorForm.hospital_id}
                  onChange={(e) => setDoctorForm({ ...doctorForm, hospital_id: e.target.value })}
                  required
                />
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                  placeholder="Doctor Name"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  required
                />
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                  placeholder="Specialization"
                  value={doctorForm.specialization}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                  required
                />
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                  placeholder="Contact"
                  value={doctorForm.contact}
                  onChange={(e) => setDoctorForm({ ...doctorForm, contact: e.target.value })}
                  required
                />
                <div className="text-xs text-gray-500 mb-1">Availability (JSON format)</div>
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 h-32 font-mono text-xs"
                  value={doctorForm.availability}
                  onChange={(e) => setDoctorForm({ ...doctorForm, availability: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    placeholder="Doctor Username"
                    value={doctorForm.username}
                    onChange={(e) => setDoctorForm({ ...doctorForm, username: e.target.value })}
                    required
                  />
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    placeholder="Doctor Password"
                    type="password"
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    required
                  />
                </div>
                <button
                  disabled={isLoading}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium"
                >
                  Register Doctor
                </button>
              </form>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-200 mb-3">Upcoming Appointments</h4>
              {managerAppointments.length === 0 ? (
                <div className="text-center py-10 bg-gray-800/30 rounded-xl border border-dashed border-gray-700 text-gray-500">
                  No appointments found for this hospital manager.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {managerAppointments.map((app) => (
                    <div key={app.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-white font-medium">{app.patient_name}</div>
                          <div className="text-xs text-gray-400">{app.patient_contact}</div>
                        </div>
                        <div className="text-amber-400 font-medium">#{app.id}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-xs">
                        <div className="text-gray-400">Doctor:</div>
                        <div className="text-gray-200">{app.doctor_name}</div>
                        <div className="text-gray-400">Date/Time:</div>
                        <div className="text-gray-200">{app.appointment_date} @ {app.appointment_time}</div>
                        <div className="text-gray-400">Status:</div>
                        <div className="text-emerald-400 uppercase font-bold text-[10px]">{app.status}</div>
                      </div>
                      {app.notes && (
                        <div className="mt-2 p-2 bg-gray-900/50 rounded text-gray-300 text-[11px]">
                          Note: {app.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {message && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm">{message}</div>}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm">{error}</div>}

      {!selectedRole && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-sm">
          Select Patient, Hospital, Monitoring, or Admin to continue.
        </div>
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
