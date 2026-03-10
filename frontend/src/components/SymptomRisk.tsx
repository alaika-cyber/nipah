import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import {
  getSymptomCatalog,
  assessSymptoms,
  type SymptomCatalog,
  type SymptomAssessmentResult,
} from '../services/api';

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  neurological: { label: 'Neurological Symptoms', icon: '🧠', color: 'border-red-500/30' },
  respiratory: { label: 'Respiratory Symptoms', icon: '🫁', color: 'border-orange-500/30' },
  general: { label: 'General Symptoms', icon: '🤒', color: 'border-yellow-500/30' },
  exposure: { label: 'Exposure Risk Factors', icon: '⚠️', color: 'border-purple-500/30' },
};

const CATEGORY_ORDER = ['neurological', 'respiratory', 'general', 'exposure'];

export default function SymptomRisk() {
  const [catalog, setCatalog] = useState<SymptomCatalog | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<SymptomAssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCatalog, setIsFetchingCatalog] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSymptomCatalog()
      .then(setCatalog)
      .catch(() => setError('Failed to load symptoms. Please refresh.'))
      .finally(() => setIsFetchingCatalog(false));
  }, []);

  const toggleSymptom = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
    setResult(null);
  };

  const handleAssess = async () => {
    if (selected.size === 0) {
      setError('Please select at least one symptom.');
      return;
    }
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const response = await assessSymptoms(Array.from(selected));
      setResult(response);
    } catch {
      setError('Failed to assess symptoms. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelected(new Set());
    setResult(null);
    setError('');
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Safe':
        return <CheckCircle className="text-green-500" size={48} />;
      case 'Low Risk':
        return <AlertTriangle className="text-yellow-500" size={48} />;
      case 'High Risk':
        return <XCircle className="text-red-500" size={48} />;
      default:
        return <Shield size={48} />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Safe':
        return 'border-green-500/30 bg-green-500/5';
      case 'Low Risk':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'High Risk':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return '';
    }
  };

  const getRiskBarColor = (level: string) => {
    switch (level) {
      case 'Safe':
        return 'bg-green-500';
      case 'Low Risk':
        return 'bg-yellow-500';
      case 'High Risk':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isFetchingCatalog) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Symptom-Based Risk Assessment
        </h2>
        <p className="text-gray-400 text-sm">
          Select the symptoms you're experiencing for a preliminary risk evaluation
        </p>
      </div>

      {/* Symptom Categories */}
      <div className="space-y-6">
        {CATEGORY_ORDER.map((catKey) => {
          const catInfo = CATEGORY_LABELS[catKey];
          const symptoms = catalog?.categories[catKey] || [];
          if (symptoms.length === 0) return null;

          return (
            <div
              key={catKey}
              className={`border rounded-2xl p-5 bg-gray-800/30 ${catInfo.color}`}
            >
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span>{catInfo.icon}</span>
                {catInfo.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {symptoms.map((symptom) => (
                  <label
                    key={symptom.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selected.has(symptom.id)
                        ? 'bg-indigo-600/20 border border-indigo-500/50'
                        : 'bg-gray-800/50 border border-transparent hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(symptom.id)}
                      onChange={() => toggleSymptom(symptom.id)}
                      className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-800"
                    />
                    <span className="text-sm text-gray-200">{symptom.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleAssess}
          disabled={isLoading || selected.size === 0}
          className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Assessing...
            </>
          ) : (
            <>
              <Shield size={20} />
              Assess Risk ({selected.size} selected)
            </>
          )}
        </button>
        {selected.size > 0 && (
          <button
            onClick={handleReset}
            className="py-3 px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-colors cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Risk Level */}
          <div
            className={`border-2 rounded-2xl p-6 text-center ${getRiskColor(
              result.risk_level
            )}`}
          >
            <div className="flex justify-center mb-3">
              {getRiskIcon(result.risk_level)}
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">
              {result.risk_level}
            </h3>

            {/* Risk Bar */}
            <div className="max-w-md mx-auto mt-4">
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${getRiskBarColor(
                    result.risk_level
                  )}`}
                  style={{ width: `${result.risk_percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Safe</span>
                <span>Risk Score: {result.risk_score}</span>
                <span>High Risk</span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3">Recommendation</h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              {result.recommendation}
            </p>
          </div>

          {/* Matched Symptoms */}
          {result.matched_symptoms.length > 0 && (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
              <h4 className="text-lg font-semibold text-white mb-3">
                Analyzed Symptoms ({result.matched_symptoms.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.matched_symptoms.map((s) => (
                  <span
                    key={s.id}
                    className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300"
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-sm">
            {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
