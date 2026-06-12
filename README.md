# LUCID — Livestock Unified Clinical Intelligence Dashboard

An explainable AI decision-support system for precision dairy farming in Nigeria.

## Project Structure

```
LUCID/
├── backend/              # Django REST API + ML pipeline
│   ├── config/           # Django project settings, urls, wsgi, asgi
│   ├── core/             # Core app: models, views, serializers, ML service
│   ├── data/             # Raw sensor data (CSV)
│   ├── saved_models/     # Trained .joblib model files + SHAP explainers
│   ├── evaluation_exports/
│   ├── manage.py
│   └── requirements.txt
└── frontend/             # Next.js dashboard
    ├── src/app/
    │   ├── page.tsx      # Main dashboard
    │   ├── layout.tsx
    │   └── globals.css
    ├── package.json
    └── next.config.ts
```

## Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Django 5 + Django REST Framework  |
| ML        | scikit-learn, SHAP, joblib        |
| Database  | PostgreSQL                        |
| Frontend  | Next.js 16, React 19, TypeScript  |

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features

- 🐄 **Herd Health Monitoring** — Real-time sensor-driven alerts
- 🧠 **XAI Explanations** — SHAP-based model interpretation
- 🌡️ **Heat Stress Detection** — Environmental risk scoring
- 🔬 **Mastitis Risk** — Early-warning classification
- 🐣 **Calving Prediction** — Imminent calving alerts
- ♀️ **Estrus Detection** — Reproductive cycle insights
