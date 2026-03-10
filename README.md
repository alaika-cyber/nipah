# Nipah Virus Awareness Platform

AI-powered health education and risk assessment platform for Nipah virus awareness. Built with FastAPI, React, and Machine Learning.

> ⚠️ **DISCLAIMER**: This platform is for **educational purposes only**. It does NOT provide medical diagnosis. Always consult qualified healthcare professionals for medical advice.

---

## Modules

### Module 1: AI-Powered Speaking Chatbot
- Voice input via Web Speech API
- AI-generated responses about Nipah virus (symptoms, prevention, transmission, treatment)
- Interactive animated avatar with speech synthesis
- Works offline with comprehensive built-in knowledge base, or with OpenAI API for enhanced responses

### Module 2: Blood Parameter Risk Prediction (ML)
- Enter blood test values (WBC, Platelets, Hemoglobin, AST, ALT, CRP, Creatinine)
- Random Forest classifier trained on Nipah-relevant blood markers
- Outputs: Negative / Low Risk / High Risk with probability scores
- Visual parameter analysis with normal range indicators

### Module 3: Symptom-Based Risk Assessment
- Select symptoms from categorized checklist (neurological, respiratory, general, exposure)
- Weighted scoring algorithm based on clinical literature
- Outputs: Safe / Low Risk / High Risk with recommendations
- Combination bonuses for clinically significant symptom patterns

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 + Vite |
| Backend | Python FastAPI |
| ML Model | scikit-learn Random Forest |
| Speech | Web Speech API (browser-native) |
| LLM | OpenAI API (optional, built-in fallback) |
| Deployment | Docker + Docker Compose + Nginx |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Optional: Set up OpenAI API for enhanced chatbot
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Docker Deployment
```bash
# Optional: set OpenAI key
export OPENAI_API_KEY=your-key-here

docker compose up --build
```

Open http://localhost in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/chat/` | Send message to chatbot |
| POST | `/api/v1/blood-risk/predict` | Predict risk from blood parameters |
| GET | `/api/v1/blood-risk/parameters` | Get parameter info & normal ranges |
| POST | `/api/v1/symptom-risk/assess` | Assess risk from symptoms |
| GET | `/api/v1/symptom-risk/symptoms` | Get symptom catalog |

---

## Project Structure

```
nipah/
├── backend/
│   ├── main.py                  # FastAPI application
│   ├── config.py                # Configuration & settings
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routers/
│   │   ├── chatbot.py           # Module 1: Chat API
│   │   ├── blood_risk.py        # Module 2: Blood risk API
│   │   └── symptom_risk.py      # Module 3: Symptom risk API
│   ├── models/
│   │   ├── blood_model.py       # ML model training & inference
│   │   └── symptom_engine.py    # Rule-based symptom assessment
│   └── services/
│       └── llm_service.py       # LLM integration & knowledge base
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app with tab navigation
│   │   ├── components/
│   │   │   ├── Avatar.tsx       # Animated AI avatar
│   │   │   ├── ChatBot.tsx      # Module 1: Chat UI
│   │   │   ├── BloodRisk.tsx    # Module 2: Blood parameters form
│   │   │   └── SymptomRisk.tsx  # Module 3: Symptom checklist
│   │   ├── hooks/
│   │   │   └── useSpeech.ts     # Voice input/output hook
│   │   └── services/
│   │       └── api.ts           # API client
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```