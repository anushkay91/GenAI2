# Google Cloud Deployment & Recovery Guide (GenAI2)

**Document Reference:** `docs/audit/DEPLOYMENT_RECOVERY.md`  
**Phase:** Phase 5 Deliverable  
**Date:** November 21, 2026  
**Project:** Smart City Decision Intelligence Platform  
**Target Repository:** [anushkay91/GenAI2](https://github.com/anushkay91/GenAI2)  
**Branch:** `audit/engineering-refinement`  

---

## 1. Forensic Audit of Google Cloud Accounts & Migration

The repository was originally configured for a legacy Google Cloud account (`carbon1-499909`) where billing was inactive. During this audit and recovery process, all active infrastructure links were migrated to the owner's active project: **`smartcity-515403`**.

### Configuration Difference Matrix

| Infrastructure Resource | Legacy Account (Obsolete) | Current Account (Verified Active) | Status |
| :--- | :--- | :--- | :--- |
| **GCP Project ID** | `carbon1-499909` | `smartcity-515403` | Verified in `.github/workflows/deploy.yml` and `config.py` |
| **GCP Project Number** | `1039572329634` | `1054042324015` | Verified in Workload Identity Provider string |
| **Primary Region** | `asia-south1` (Mumbai) | `asia-south1` (Mumbai) | Verified (Low latency for Indian Municipalities) |
| **Service Account** | `github-deployer@carbon1-499909.iam...` | `github-deployer@smartcity-515403.iam.gserviceaccount.com` | Created and bound to GitHub OIDC |
| **Artifact Registry** | `.../carbon1-499909/smart-city-repo` | `asia-south1-docker.pkg.dev/smartcity-515403/smart-city-repo` | Active & receiving images |
| **Workload Identity Pool** | `github-pool` (unreachable) | `github-pool` (global) | Active on Google Cloud |
| **OIDC Provider** | `github-provider` (invalid) | `github-provider` (with `attribute-condition`) | Active on Google Cloud |
| **Cloud Run Service** | `decision-intel-backend` | `decision-intel-backend` | Deployed & Running |

---

## 2. Three Distinct Operational Modes

The platform is engineered to support three distinct operational tiers to accommodate offline academic presentations, local testing, and production cloud scaling:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. SAFE SIMULATOR MODE                          │
│  Zero cloud credits required. Runs 100% offline.                       │
│  SQLite database fallback + Mock BigQuery + Deterministic AI engine.   │
├────────────────────────────────────────────────────────────────────────┤
│                        2. LOCAL HYBRID DEV MODE                        │
│  Docker Compose (`ankane/pgvector`) + FastAPI (port 8000) + Vite (5173)│
│  Enables native vector storage and hot-reloading development.          │
├────────────────────────────────────────────────────────────────────────┤
│                      3. PRODUCTION CLOUD RUN MODE                      │
│  Stateless container on Google Cloud Run (`asia-south1`).              │
│  Keyless Workload Identity Federation + Multi-stage Docker build.      │
└────────────────────────────────────────────────────────────────────────┘
```

### Mode 1: Safe Simulator Mode (Offline / Zero Cost)
* **When to use:** Local testing, offline grading, hackathon booths without stable internet or cloud budgets.
* **Requirements:** Only Python 3.10+ and Node 18+ (No Docker or GCP credentials required).
* **Execution:**
  ```bash
  # Terminal 1: Backend
  cd backend && python -m uvicorn app.main:app --port 8000
  # Terminal 2: Frontend
  cd frontend && npm run dev
  ```
* **Behaviors:** Database automatically creates `backend/decision_intel.db`; AI responses and BigQuery telemetry fall back to the built-in deterministic simulation generators.

### Mode 2: Local Hybrid Mode (Docker Compose)
* **When to use:** Testing real PostgreSQL vector storage and container networking locally.
* **Requirements:** Docker Desktop.
* **Execution:**
  ```bash
  docker-compose up --build
  ```
* **Behaviors:** Spawns a dedicated PostgreSQL 15 container with `pgvector` extension and binds the FastAPI app on port 8000.

### Mode 3: Production Cloud Run Mode
* **When to use:** Production deployment and live URL demonstrations.
* **Execution:** Automated via GitHub Actions on push to `main` branch.
* **Behaviors:** Cloud Run dynamically injects `PORT=8080`, mounts the static React build inside the Python container, and executes under the `github-deployer` service account.

---

## 3. Environment Variables Reference

| Variable Name | Required in Prod? | Default (Local) | Production Value (`smartcity-515403`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Yes | `development` | `production` | Switches environment mode and strict logging. |
| `DEBUG` | No | `true` | `false` | Disables debug logs and detailed stack traces. |
| `PORT` | Yes (Cloud Run) | `8000` | `8080` | Port listened to by Uvicorn. Set automatically by Cloud Run. |
| `SECRET_KEY` | **Yes (Critical)** | Hardcoded string | 64-character random hex string | Signs JWT tokens. Must be set in Secret Manager / Cloud Run. |
| `GCP_PROJECT_ID` | Yes | `smartcity-515403` | `smartcity-515403` | Target Google Cloud project identifier. |
| `GCP_LOCATION` | Yes | `asia-south1` | `asia-south1` | Google Cloud region (Mumbai). |
| `GEMINI_MODEL` | No | `gemini-1.5-pro` | `gemini-1.5-pro` | Gemini model identifier used for multimodal reasoning. |
| `EMBEDDING_MODEL`| No | `text-embedding-004`| `text-embedding-004` | Vertex AI embedding model for RAG vectorization. |
| `GEMINI_API_KEY` | Optional | `""` | Google AI Studio Key | Optional API key if running in developer mode rather than Vertex. |
| `ALLOYDB_HOST` | No | `localhost` | Private IP | Hostname for PostgreSQL / AlloyDB. |
| `BQ_DATASET` | No | `smart_city_metrics`| `smart_city_metrics` | BigQuery dataset containing telemetry and grievance tables. |
| `GCS_BUCKET_NAME`| No | `smart-city-documents-bucket` | `smart-city-documents-smartcity-515403` | GCS bucket for policy PDFs. |

---

## 4. Minimal Least-Privilege IAM Roles

To adhere to DevSecOps best practices, the `github-deployer` service account is restricted to four minimal IAM roles:

```bash
# 1. Manage Cloud Run service revisions
roles/run.admin

# 2. Push built Docker images to Artifact Registry
roles/artifactregistry.writer

# 3. Allow Cloud Run to execute under this service account identity
roles/iam.serviceAccountUser

# 4. Allow GitHub Actions OIDC to impersonate the account
roles/iam.workloadIdentityUser
```

---

## 5. Health Check & Deployment Smoke Tests

The service exposes a diagnostic health endpoint at `/health`.

### Verification Command:
```bash
curl -s https://<YOUR_CLOUD_RUN_URL>/health
```

### Expected Response Contract:
```json
{
  "status": "online",
  "app_name": "Smart City Decision Intelligence Platform",
  "version": "1.0.0",
  "environment": "production",
  "gcp_project": "smartcity-515403",
  "database": {
    "type": "AlloyDB / PostgreSQL",
    "connected": true
  },
  "gemini_engine": {
    "model": "gemini-1.5-pro",
    "mode": "Active Cloud SDK"
  }
}
```

### One-Click Rollback Procedure
If a newly deployed container revision exhibits issues:
1. Open [Google Cloud Run Console](https://console.cloud.google.com/run/detail/asia-south1/decision-intel-backend?project=smartcity-515403).
2. Click the **Revisions** tab.
3. Select the previous stable revision.
4. Click **Manage Traffic** -> Route 100% traffic back to the previous revision -> Click **Save**. Rollback completes in under 5 seconds without rebuilding.

---
*End of Phase 5 Deliverable — Generated on branch `audit/engineering-refinement`.*
