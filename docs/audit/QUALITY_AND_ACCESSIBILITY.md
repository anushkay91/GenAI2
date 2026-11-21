# Code Quality, Security & Accessibility Audit (GenAI2)

**Document Reference:** `docs/audit/QUALITY_AND_ACCESSIBILITY.md`  
**Phase:** Phase 4 Deliverable  
**Date:** November 21, 2026  
**Project:** Smart City Decision Intelligence Platform  
**Target Repository:** [anushkay91/GenAI2](https://github.com/anushkay91/GenAI2)  
**Branch:** `audit/engineering-refinement`  

---

## 1. Code Quality & Architecture Review

### Backend (FastAPI, Python 3.11+, SQLAlchemy 2.0)
- **Strengths:**
  - Modern FastAPI with type annotations and Pydantic v2 schemas across all request/response models.
  - Layered architectural separation: Routers (`routers/`) -> Agents (`agents/`) -> Services (`services/`) -> Data Models (`models/`).
  - Dual-mode database layer in `backend/app/services/db.py` enables seamless developer onboarding without requiring a local PostgreSQL instance.
- **Identified Weaknesses & Refactoring Targets:**
  1. **Heuristic Parsing in Agent Router:** In [backend/app/agents/ceo.py#L140-L146](file:///c:/Users/Lenovo/Desktop/AllP/GenAI2-main/backend/app/agents/ceo.py#L140-L146), ward IDs and sectors are parsed via string splitting rather than Pydantic extraction.
  2. **Unused Dependencies:** `google-cloud-firestore` and `google-cloud-aiplatform` are listed in `backend/requirements.txt` but never imported or invoked in runtime code.
  3. **Synchronous Execution Bottleneck:** While FastAPI endpoints are `async`, several database queries and LLM invocations run synchronously on the event loop, which can degrade throughput under concurrent load.

### Frontend (React 18, TypeScript, TailwindCSS, Vite)
- **Strengths:**
  - Strict TypeScript interfaces in `frontend/src/types/index.ts` synchronized with backend entities.
  - Component modularity with clear domain boundaries (`Dashboard`, `AskAI`, `WorkflowManager`, `DocumentManager`, `AlertPanel`).
  - Native CSS utility styling via TailwindCSS with zero runtime CSS-in-JS overhead.
- **Identified Weaknesses & Refactoring Targets:**
  1. **State Duplication in `App.tsx`:** User role state and token management are held in `App.tsx` and passed via props rather than using a centralized React Context or lightweight Zustand store.
  2. **Missing Unit & Component Tests:** Zero automated tests configured in `frontend/package.json`.
  3. **Legacy NPM Sub-dependencies:** GitHub Dependabot flagged 96 advisory notices relating to older `vite` and `esbuild` versions in `package-lock.json`.

---

## 2. Security & OWASP Top 10 Forensic Assessment

| OWASP Category | Current Implementation & Evidence | Vulnerability / Residual Risk | Severity | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **A01: Broken Access Control** | `RoleChecker` dependency injection enforces role authorization on `/api/agent/workflows` and `/api/agent/documents/upload`. | None for administrative mutations; citizens are properly blocked with HTTP 403. | **Low** | Maintain automated regression tests in `test_api.py`. |
| **A02: Cryptographic Failures** | Native `bcrypt` (12 rounds) replaces deprecated passlib. JWT signed via `HS256`. | `SECRET_KEY` in `backend/app/config.py` defaults to `"SUPER_SECRET_SMART_CITY_DECISION_PLATFORM_KEY"`. | **Critical** | Fail startup in production if `SECRET_KEY` matches default value or is $< 32$ chars. |
| **A03: Injection (SQL & Prompt)** | BigQuery filters sanitized via `re.sub(r"[^a-zA-Z0-9_\-\s]", "", val)`. PDF magic bytes verified. | User prompt directly concatenated into CEO executive synthesis prompt (`ceo.py#L197`). | **High** | Wrap user input in XML/delimited prompt tags; use BigQuery `ScalarQueryParameter`. |
| **A04: Insecure Design** | Local SQLite fallback allows zero-configuration offline development. | In Cloud Run, SQLite is ephemeral; data is wiped on container restart. | **High** | Document Cloud SQL / AlloyDB connection with VPC connector for production. |
| **A05: Security Misconfiguration** | `SecurityHeadersMiddleware` injects `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`. | Missing `Content-Security-Policy` (CSP) and `Strict-Transport-Security` (HSTS). | **Medium** | Add comprehensive CSP and HSTS headers in `backend/app/main.py`. |
| **A06: Vulnerable Dependencies** | Core dependencies pinned in `requirements.txt` and `package-lock.json`. | Frontend lockfile contains transitive vulnerabilities in dev toolchain (`vite@5.2.11`). | **Medium** | Upgrade frontend toolchain to `vite@5.4.11` and run `npm audit fix`. |
| **A07: Identification Failures** | Cryptographic JWT tokens expire after 120 minutes. | No IP rate limiting on `/api/auth/token`; demo accounts have known default passwords. | **Medium** | Add `slowapi` rate limiting (max 10 requests/min per IP on login endpoint). |
| **A08: Software Integrity Failures** | PDF upload validates `%PDF-` magic bytes and strictly sanitizes filenames. | None; path traversal protected via `os.path.basename` and regex cleanup. | **Low** | Retain verified sanitization in `storage.py`. |

---

## 3. Accessibility Evaluation (WCAG 2.2 AA Target)

We evaluated the React frontend across all 5 user views against the Web Content Accessibility Guidelines (WCAG 2.2 AA):

### A. Semantic Structure & Keyboard Navigation
- **Skip Navigation:** Implemented in [frontend/src/App.tsx#L96-L101](file:///c:/Users/Lenovo/Desktop/AllP/GenAI2-main/frontend/src/App.tsx#L96-L101) (`<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>`).
- **Tablist Semantics:** Main navigation correctly uses `role="tablist"` with `role="tab"`, `aria-selected`, and `aria-controls`.
- **Keyboard Esc Handler:** Role switcher dropdown captures `Escape` key to close menu.

### B. Accessibility Gaps & Failure Documentations

| Issue ID | Affected File | WCAG Criterion | Severity | Failure Description | Proposed Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ACC-01** | `frontend/src/components/WorkflowManager.tsx` | **2.1.2 No Keyboard Trap & 2.4.3 Focus Order** | **High** | When "Create Workflow Ticket" modal opens, keyboard focus is not trapped inside the dialog. Pressing Tab cycles through background dashboard controls. | Implement focus trap hook using `ref` and constrain Tab cycling within the modal. |
| **ACC-02** | `frontend/src/components/Dashboard.tsx` | **1.4.3 Contrast (Minimum - 4.5:1)** | **Medium** | Metric card secondary text uses `text-slate-400` on white/slate-50 background, yielding a 3.2:1 contrast ratio. | Change secondary labels to `text-slate-600` (5.8:1 contrast ratio). |
| **ACC-03** | `frontend/src/components/Dashboard.tsx` | **1.1.1 Non-text Content** | **Medium** | Recharts SVG line/bar charts convey telemetry data visually without `<title>` or accessible tabular summary for screen readers. | Add `aria-label` and provide an accessible summary table beneath visual charts. |
| **ACC-04** | `frontend/src/components/AskAI.tsx` | **4.1.3 Status Messages** | **Low** | Streaming/loading indicator during agent reasoning lacks an `aria-live="polite"` container, leaving screen reader users unaware of processing state. | Wrap agent reasoning progress in an `aria-live="polite"` status region. |
| **ACC-05** | `frontend/src/App.tsx` | **2.4.7 Focus Visible** | **Low** | Role selector menu items do not display a visible focus outline when navigated via Arrow keys. | Add `focus:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500` to menu items. |

---

## 4. Implementation Priorities for Remediation

1. **Security (P0):**
   - Add environment check in `backend/app/config.py`: refuse startup if `ENVIRONMENT=production` and `SECRET_KEY` is unchanged.
   - Install `slowapi` and add rate-limiting decorator to `/api/auth/token`.
2. **Accessibility (P1):**
   - Implement focus trap in `WorkflowManager.tsx` modal.
   - Adjust color contrast across `Dashboard.tsx` metric cards to exceed 4.5:1.
   - Add `aria-live="polite"` status announcement to `AskAI.tsx`.
3. **Dependencies & Cleanup (P2):**
   - Remove unused dependencies (`google-cloud-firestore`, `google-cloud-aiplatform`) from `backend/requirements.txt`.
   - Update frontend build dependencies to address security advisories.

---
*End of Phase 4 Deliverable — Generated on branch `audit/engineering-refinement`.*
