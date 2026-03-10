import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';
import {
  predictBloodRisk,
  type BloodParameters,
  type BloodRiskResponse,
} from '../services/api';

const FIELDS: {
  key: keyof BloodParameters;
  label: string;
  unit: string;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  step: number;
  placeholder: string;
}[] = [
  { key: 'wbc', label: 'WBC (White Blood Cells)', unit: '×10³/µL', min: 0.5, max: 30, normalMin: 4.5, normalMax: 11, step: 0.1, placeholder: '7.5' },
  { key: 'platelets', label: 'Platelets', unit: '×10³/µL', min: 10, max: 600, normalMin: 150, normalMax: 400, step: 1, placeholder: '250' },
  { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', min: 5, max: 20, normalMin: 12, normalMax: 17, step: 0.1, placeholder: '14.5' },
  { key: 'ast', label: 'AST (SGOT)', unit: 'U/L', min: 5, max: 500, normalMin: 10, normalMax: 40, step: 1, placeholder: '25' },
  { key: 'alt', label: 'ALT (SGPT)', unit: 'U/L', min: 5, max: 500, normalMin: 7, normalMax: 56, step: 1, placeholder: '30' },
  { key: 'crp', label: 'CRP (C-Reactive Protein)', unit: 'mg/L', min: 0, max: 300, normalMin: 0, normalMax: 10, step: 0.1, placeholder: '3' },
  { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', min: 0.3, max: 10, normalMin: 0.6, normalMax: 1.2, step: 0.01, placeholder: '0.9' },
];

export default function BloodRisk() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BloodRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    // Validate all fields
    const params: Record<string, number> = {};
    for (const field of FIELDS) {
      const val = parseFloat(values[field.key] || '');
      if (isNaN(val) || val < field.min || val > field.max) {
        setError(
          `${field.label} must be between ${field.min} and ${field.max} ${field.unit}`
        );
        return;
      }
      params[field.key] = val;
    }

    setIsLoading(true);
    try {
      const response = await predictBloodRisk(params as unknown as BloodParameters);
      setResult(response);
    } catch {
      setError('Failed to get prediction. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskIcon = (prediction: string) => {
    switch (prediction) {
      case 'Negative':
        return <CheckCircle className="text-green-500" size={48} />;
      case 'Low Risk':
        return <AlertTriangle className="text-yellow-500" size={48} />;
      case 'High Risk':
        return <XCircle className="text-red-500" size={48} />;
      default:
        return null;
    }
  };

  const getRiskColor = (prediction: string) => {
    switch (prediction) {
      case 'Negative':
        return 'border-green-500/30 bg-green-500/5';
      case 'Low Risk':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'High Risk':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal':
        return 'text-green-400';
      case 'Low':
        return 'text-yellow-400';
      case 'High':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Blood Parameter Risk Prediction
        </h2>
        <p className="text-gray-400 text-sm">
          Enter your blood test parameters to assess potential risk level using our ML model
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div
              key={field.key}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
            >
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {field.label}
                <span className="text-gray-500 ml-1">({field.unit})</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  value={values[field.key] || ''}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  Normal: {field.normalMin}-{field.normalMax}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Blood Parameters'
          )}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Prediction Result */}
          <div
            className={`border-2 rounded-2xl p-6 text-center ${getRiskColor(
              result.prediction
            )}`}
          >
            <div className="flex justify-center mb-3">
              {getRiskIcon(result.prediction)}
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">
              {result.prediction}
            </h3>
            <div className="flex justify-center gap-4 mt-4">
              {Object.entries(result.probabilities).map(([label, prob]) => (
                <div key={label} className="text-center">
                  <div className="text-sm text-gray-400">{label}</div>
                  <div className="text-lg font-semibold text-white">
                    {(prob * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parameter Analysis */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Info size={18} />
              Parameter Analysis
            </h4>
            <div className="space-y-3">
              {result.parameter_analysis.map((param) => {
                const percentage =
                  ((param.user_value - param.normal_min) /
                    (param.normal_max - param.normal_min)) *
                  100;
                return (
                  <div key={param.parameter} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        {param.parameter}{' '}
                        <span className="text-gray-500">({param.unit})</span>
                      </span>
                      <span className={getStatusColor(param.status)}>
                        {param.user_value} — {param.status}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          param.status === 'Normal'
                            ? 'bg-green-500'
                            : param.status === 'Low'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.max(5, Math.min(100, percentage))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{param.normal_min}</span>
                      <span>Normal range</span>
                      <span>{param.normal_max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-sm">
            {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
