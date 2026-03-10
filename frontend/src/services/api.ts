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
