# 🏛️ Smart City Decision Intelligence Platform

> **Autonomous Multi-Agent AI Platform for Urban Governance & Smart Infrastructure Management**  
> Tailored for Indian Smart Cities (Varanasi Administration & Command Hub).

---

## 📌 Executive Summary

The **Smart City Decision Intelligence Platform** is an enterprise-grade AI operations engine designed to assist municipal district officers, urban planners, and civic analysts in managing city infrastructure. 

By combining **Gemini 1.5 Pro multimodal reasoning**, **Retrieval-Augmented Generation (RAG) over municipal SOPs**, **BigQuery telemetry analytics**, and **AlloyDB operational workflows**, the system proactively identifies anomalies, forecasts infrastructure strain, and orchestrates mitigation actions.

```
                              ┌───────────────────────────────────┐
                              │    CEO Orchestrator Agent (LLM)   │
                              └─────────────────┬─────────────────┘
                                                │
         ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
         ▼                  ▼                   ▼                   ▼                  ▼
  ┌──────────────┐   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
  │  Analytics   │   │  Data Agent  │    │  Rag Agent   │    │  Prediction  │   │   Workflow   │
  │    Agent     │   │   (AlloyDB   │    │ (Vector SOPs │    │    Agent     │   │    Agent     │
  │  (BigQuery)  │   │  Workflows)  │    │  pgvector)   │    │  (Forecasting│   │  (Automated  │
  └──────────────┘   └──────────────┘    └──────────────┘    └──────────────┘   └──────────────┘
```

---

## 🚀 Key Architectural Pillars

### 1. Multi-Agent Ecosystem
* **CEOAgent (Central Orchestrator):** Classifies requests, selects dynamic sub-agent pipelines, synthesizes executive summaries, and logs audit trails.
* **AnalyticsAgent:** Extracts municipal trends from BigQuery (citizen grievance volumes, resolution times, sensor time-series).
* **DataAgent:** Manages operational records in AlloyDB / PostgreSQL (ticket logging, status tracking, audit logging).
* **PredictionAgent:** Forecasts 24–48 hour capacity strains and anomaly risks (e.g., monsoon drainage overload, rush-hour traffic bottlenecks).
* **RagAgent:** Performs semantic cosine-distance retrieval across municipal SOPs and policy guidelines using 768-dimensional embeddings.
* **RecommendationAgent:** Formulates structured mitigation strategies (Immediate, Remedial, Strategic).
* **WorkflowAgent:** Dispatches automated SMS alerts to ward supervisors and triggers operational work orders.

### 2. Security Architecture (OWASP Top 10 Aligned)
* **Cryptographic JWT Authentication:** Signed tokens using HMAC-SHA256 (`HS256`) with configurable expiration.
* **Role-Based Access Control (RBAC):** Strict endpoint-level authorization via `RoleChecker`:
  * `officer`: Full operational authority (trigger workflows, review alerts, manage tickets).
  * `analyst`: Read-only access to sensor telemetry, grievances, and document indexing.
  * `citizen`: Public transparency dashboard, general Q&A; restricted from document ingestion and operational dispatch.
* **Hardened File Ingestion:**
  * Path traversal protection using strict basename sanitization and isolated directory confinement.
  * PDF Magic Byte verification (`%PDF-`) preventing file extension spoofing.
  * Enforced file size limits (10MB max).
* **SQL Injection Prevention:** Input sanitization and parameterized conditions across BigQuery analytics adapters.
* **Strict CORS & Security Headers:** Explicit origin whitelisting, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.

### 3. Accessibility (WCAG 2.1 AA Compliant)
* **Keyboard Navigation:** Full tab order with visible focus indicators (`focus-visible:ring-2 focus-visible:ring-blue-500`).
* **ARIA Semantics:** Proper `role="tablist"`, `role="tab"`, `role="dialog"`, `role="log"`, `aria-expanded`, and `aria-live="polite"` regions.
* **Skip Links:** Accessible skip-to-content navigation for screen readers.
* **Semantic Tables:** Full `<caption>` and `<th scope="col">` markup across telemetry and workflow tables.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Lucide Icons, Recharts |
| **Backend API** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy 2.0 |
| **Authentication** | Cryptographic JWT (python-jose), Native bcrypt (12 rounds) |
| **Operational Store** | Google Cloud AlloyDB / PostgreSQL 15 + `pgvector` (SQLite vector fallback) |
| **Analytics Engine** | Google Cloud BigQuery (with simulator fallback) |
| **Document Vector RAG** | Google Cloud Storage (GCS), pypdf, text-embedding-004 |
| **Generative AI** | Google Gemini 1.5 Pro & Gemini 1.5 Pro Vision (`google-genai` SDK) |
| **Containerization** | Docker, Multi-stage Dockerfile, Docker Compose |
| **CI/CD** | GitHub Actions (automated linting, pytest, vite build) |

---

## 🏃 Local Quick Start

### Prerequisites
* Python 3.10+ (or Python Launcher `py`)
* Node.js 18+ and npm
* *(Optional)* Docker and Docker Compose

### 1. Clone & Configure
```bash
git clone https://github.com/your-org/smart-city-decision-intel.git
cd smart-city-decision-intel
cp .env.example .env
```

### 2. Run with Docker Compose (Recommended)
```bash
docker-compose up --build
```
The unified platform will be accessible at `http://localhost:8000`.

---

### 3. Manual Local Development

#### Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Testing & Software Development Life Cycle (SDLC)

### Run Automated Backend Test Suite
```bash
cd backend
pytest -v
```
The test suite validates:
- `test_auth.py`: Password hashing, JWT token lifecycle, RoleChecker enforcement.
- `test_agents.py`: CEO coordination, prediction logic, analytics queries, recommendation generation.
- `test_api.py`: Endpoint health, role switching, workflow RBAC, multimodal chat endpoints.

### Run Frontend Typecheck & Build
```bash
cd frontend
npm run build
```

---

## 🔒 Pre-Seeded Demo Accounts (RBAC)

The local SQLite and AlloyDB databases automatically seed three verification accounts on startup:

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Officer** | `Director_Karthik` | `Password123!` | Full admin, trigger workflows, upload docs |
| **Analyst** | `Analyst_Priya` | `Password123!` | Read analytics, upload and query SOPs |
| **Citizen** | `Aarav_Sharma` | `Password123!` | Public transparency dashboard & general chat |

---

## ☁️ Google Cloud Deployment (Cloud Run)

Provision required GCP infrastructure using the included deployment scripts:

```powershell
# Windows PowerShell
.\deploy\setup_gcp.ps1 -ProjectId "your-gcp-project" -Region "asia-south1"
```

```bash
# Linux / macOS Bash
./deploy/setup_gcp.sh
```

GitHub Actions will automatically build, push to Google Artifact Registry, and deploy to **Cloud Run** on pushes to `main`.
