import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Module 1: Chatbot ---
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  disclaimer: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat/', { message, history });
  return data;
}

// --- Module 2: Blood Risk ---
export interface BloodParameters {
  wbc: number;
  platelets: number;
  hemoglobin: number;
  ast: number;
  alt: number;
  crp: number;
  creatinine: number;
}

export interface ParameterAnalysis {
  parameter: string;
  unit: string;
  normal_min: number;
  normal_max: number;
  user_value: number;
  status: string;
}

export interface BloodRiskResponse {
  prediction: string;
  risk_level: number;
  probabilities: Record<string, number>;
  parameter_analysis: ParameterAnalysis[];
  disclaimer: string;
}

export interface ParameterInfo {
  name: string;
  unit: string;
  normal_min: number;
  normal_max: number;
  description: string;
}

export async function predictBloodRisk(
  params: BloodParameters
): Promise<BloodRiskResponse> {
  const { data } = await api.post<BloodRiskResponse>('/blood-risk/predict', params);
  return data;
}

export async function getParameterInfo(): Promise<{ parameters: ParameterInfo[] }> {
  const { data } = await api.get('/blood-risk/parameters');
  return data;
}

// --- Module 3: Symptom Risk ---
export interface SymptomInfo {
  id: string;
  label: string;
  category: string;
  weight: number;
}

export interface SymptomCatalog {
  categories: Record<string, SymptomInfo[]>;
  total_symptoms: number;
}

export interface SymptomAssessmentResult {
  risk_level: string;
  risk_score: number;
  max_possible_score: number;
  risk_percentage: number;
  matched_symptoms: SymptomInfo[];
  recommendation: string;
  disclaimer: string;
}

export async function getSymptomCatalog(): Promise<SymptomCatalog> {
  const { data } = await api.get<SymptomCatalog>('/symptom-risk/symptoms');
  return data;
}

export async function assessSymptoms(
  symptoms: string[]
): Promise<SymptomAssessmentResult> {
  const { data } = await api.post<SymptomAssessmentResult>('/symptom-risk/assess', {
    symptoms,
  });
  return data;
}

// --- Module 4: Hospital Discovery & Appointment Booking ---
export interface Hospital {
  id: number;
  name: string;
  address: string;
  city: string;
  contact: string;
  latitude: number;
  longitude: number;
  manager_username: string;
  created_at: string;
  distance_km?: number;
}

export interface Doctor {
  id: number;
  hospital_id: number;
  hospital_name: string;
  name: string;
  specialization: string;
  contact: string;
  availability: Record<string, string[]>;
  username: string;
  created_at: string;
}

export interface Appointment {
  id: number;
  patient_name: string;
  patient_contact: string;
  hospital_id: number;
  hospital_name: string;
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface SlotResponse {
  doctor_id: number;
  date: string;
  weekday: string;
  scheduled_slots: string[];
  booked_slots: string[];
  available_slots: string[];
}

export interface HospitalCreateRequest {
  name: string;
  address: string;
  city: string;
  contact: string;
  latitude: number;
  longitude: number;
  manager_username: string;
  manager_password: string;
}

export interface DoctorCreateRequest {
  hospital_id: number;
  manager_username: string;
  name: string;
  specialization: string;
  contact: string;
  availability: Record<string, string[]>;
  username: string;
  password: string;
}

export interface AppointmentCreateRequest {
  patient_name: string;
  patient_contact: string;
  hospital_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
}

export async function registerHospital(payload: HospitalCreateRequest) {
  const { data } = await api.post('/hospital-booking/admin/hospitals', payload);
  return data;
}

export async function registerDoctor(payload: DoctorCreateRequest) {
  const { data } = await api.post('/hospital-booking/manager/doctors', payload);
  return data;
}

export async function getHospitals(params?: {
  city?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
}): Promise<{ hospitals: Hospital[]; total: number }> {
  const { data } = await api.get('/hospital-booking/hospitals', { params });
  return data;
}

export async function getDoctorsByHospital(
  hospitalId: number
): Promise<{ doctors: Doctor[]; total: number }> {
  const { data } = await api.get(`/hospital-booking/hospitals/${hospitalId}/doctors`);
  return data;
}

export async function getDoctorSlots(
  doctorId: number,
  date: string
): Promise<SlotResponse> {
  const { data } = await api.get(`/hospital-booking/doctors/${doctorId}/slots`, {
    params: { date },
  });
  return data;
}

export async function bookAppointment(payload: AppointmentCreateRequest) {
  const { data } = await api.post('/hospital-booking/appointments', payload);
  return data;
}

export async function getManagerAppointments(
  managerUsername: string
): Promise<{ appointments: Appointment[]; total: number }> {
  const { data } = await api.get('/hospital-booking/manager/appointments', {
    params: { manager_username: managerUsername },
  });
  return data;
}

// --- Module 5: Admin Dashboard & Red Zone Monitoring ---
export interface StateStat {
  state_name: string;
  active_cases: number;
  deaths: number;
  zone: 'Red' | 'Orange' | 'Green';
  updated_by: string;
  last_updated: string;
}

export interface ZoneSummary {
  zones: { Red: number; Orange: number; Green: number };
  total_states: number;
  total_active_cases: number;
  total_deaths: number;
}

export interface StateStatUpdateRequest {
  state_name: string;
  active_cases: number;
  deaths: number;
  updated_by: string;
}

export async function upsertStateStats(payload: StateStatUpdateRequest) {
  const { data } = await api.post('/admin-dashboard/admin/state-stats', payload);
  return data;
}

export async function getStateStats(): Promise<{ states: StateStat[]; total_states: number }> {
  const { data } = await api.get('/admin-dashboard/state-stats');
  return data;
}

export async function getZoneSummary(): Promise<ZoneSummary> {
  const { data } = await api.get('/admin-dashboard/zone-summary');
  return data;
}

// --- Role Auth (Admin/Manager) ---
export type ProtectedRole = 'admin' | 'manager';

export interface AuthPayload {
  role: ProtectedRole;
  email: string;
  password: string;
}

export interface PendingManagerRequest {
  email: string;
  role: 'manager';
  status: 'pending' | 'approved';
  created_at: string;
}

export async function authLogin(payload: AuthPayload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function authSignup(payload: AuthPayload) {
  const { data } = await api.post('/auth/signup', payload);
  return data;
}

export async function getPendingManagerRequests(adminEmail: string, adminPassword: string) {
  const { data } = await api.post('/auth/admin/pending-managers', {
    admin_email: adminEmail,
    admin_password: adminPassword,
  });
  return data as { pending_requests: PendingManagerRequest[]; total: number };
}

export async function approveManagerRequest(
  adminEmail: string,
  adminPassword: string,
  managerEmail: string
) {
  const { data } = await api.post('/auth/admin/approve-manager', {
    admin_email: adminEmail,
    admin_password: adminPassword,
    manager_email: managerEmail,
  });
  return data;
}
