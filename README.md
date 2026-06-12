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

The backend runs with **zero configuration** on SQLite out of the box. To use
PostgreSQL instead, copy `backend/.env.example` to `backend/.env` and fill in the
`DB_*` values.

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate

# One command to generate data, engineer features, train every model,
# run comparative evaluation, export figures, and seed alerts (PRD KPI: reproducibility).
python manage.py run_pipeline

python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

The dashboard auto-detects the API at `http://localhost:8000/api`. Override with
`NEXT_PUBLIC_API_BASE`. If the API is unreachable it falls back to a built-in demo
dataset so the UI is always viewable.

## Configuration (environment variables)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DJANGO_SECRET_KEY` | dev key | Django secret key |
| `DJANGO_DEBUG` | `true` | Debug mode |
| `DJANGO_ALLOWED_HOSTS` | `*` | Comma-separated allowed hosts |
| `DB_ENGINE`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT` | — (SQLite) | PostgreSQL connection; omit for SQLite |
| `DRF_REQUIRE_AUTH` | `false` | Require a token on all endpoints |
| `DRF_PAGE_SIZE` | `50` | Default list page size |

## API

REST endpoints are served under `/api/` (Django REST Framework). List endpoints are
paginated (`?page`, `?page_size`) and filterable (e.g. `/api/alerts/?trait=mastitis_risk`).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register/` | Create a user with a role, returns a token |
| POST | `/api/auth/login/` | Token login, returns the user's role |
| POST | `/api/datasets/generate/` | Generate a synthetic dataset |
| POST | `/api/datasets/import/` | Import/map a public dataset |
| POST | `/api/datasets/{id}/build_features/` | Run feature engineering |
| POST | `/api/models/train/` | Train the four model families for a trait |
| POST | `/api/models/evaluate_report/` | Comparative evaluation across all traits |
| GET | `/api/models/download_report/` · `/download_plot/` | Export CSV / AUC figure |
| POST | `/api/predictions/predict_cow/` · `/batch_predict/` | Per-cow / herd prediction |
| GET | `/api/alerts/` · `/api/diagnoses/` | Alerts with explanations; vet diagnoses |

**Roles** (FR-9.2): `farmer`, `veterinarian`, `researcher`, `administrator`.
Token auth is available; endpoints are open by default for the demo and can be
locked down with `DRF_REQUIRE_AUTH=true`.

## Features

- 🐄 **Herd Health Monitoring** — Real-time sensor-driven alerts
- 🧠 **XAI Explanations** — SHAP-based model interpretation
- 🌡️ **Heat Stress Detection** — Environmental risk scoring
- 🔬 **Mastitis Risk** — Early-warning classification
- 🐣 **Calving Prediction** — Imminent calving alerts
- ♀️ **Estrus Detection** — Reproductive cycle insights
- 📊 **Comparative Evaluation** — Interpretable vs. black-box models on accuracy & explanation quality
