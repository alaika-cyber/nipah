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
- Fully local ML inference (does not call GPT/LLM APIs)

### Module 3: Symptom-Based Risk Assessment
- Select symptoms from categorized checklist (neurological, respiratory, general, exposure)
- Weighted scoring algorithm based on clinical literature
- Outputs: Safe / Low Risk / High Risk with recommendations
- Combination bonuses for clinically significant symptom patterns
- Fully local rule engine (does not call GPT/LLM APIs)

### Module 4: Hospital Discovery and Appointment Booking
- Admin can register hospitals and manager credentials
- Hospital manager can register doctors and weekly availability schedules
- Patients can discover hospitals by city or nearby location (with map view)
- Patients can select doctor, date, available slot, and book appointment
- Managers can view booked appointments for their hospital

### Module 5: Admin Dashboard and Red Zone Monitoring
- Admin updates state-wise active cases and deaths
- System computes Red / Orange / Green zones from severity
- Public users can view read-only zone summary, state table, and charts
- Data is stored in SQLite and reflected dynamically on refresh

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 + Vite |
| Backend | Python FastAPI |
| ML Model | scikit-learn Random Forest |
| Database | SQLite |
| Speech | Web Speech API (browser-native) |
| LLM | OpenAI API for chat module only (optional, built-in fallback) |
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
# Edit .env and add your OPENAI_API_KEY (chat only)

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

SQLite data is stored in `backend/data/nipah.db` for local runs and persisted in the Docker volume `nipah_data` for container runs.

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
| POST | `/api/v1/hospital-booking/admin/hospitals` | Admin adds hospital |
| POST | `/api/v1/hospital-booking/manager/doctors` | Manager adds doctor |
| GET | `/api/v1/hospital-booking/hospitals` | List/filter hospitals |
| GET | `/api/v1/hospital-booking/hospitals/{hospital_id}/doctors` | List doctors by hospital |
| GET | `/api/v1/hospital-booking/doctors/{doctor_id}/slots?date=YYYY-MM-DD` | Get available slots |
| POST | `/api/v1/hospital-booking/appointments` | Book appointment |
| GET | `/api/v1/hospital-booking/manager/appointments?manager_username=...` | Manager appointments |
| POST | `/api/v1/admin-dashboard/admin/state-stats` | Admin upsert state stats |
| GET | `/api/v1/admin-dashboard/state-stats` | Public state data |
| GET | `/api/v1/admin-dashboard/zone-summary` | Public zone summary |

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
│       ├── llm_service.py       # Chat-only LLM integration & knowledge base
│       └── database_service.py  # SQLite persistence layer
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