# DropLink

Temporary PC-to-phone file sharing without accounts. Select files on a PC, get a QR code and short code, then open the transfer on a phone and download the files before expiry.

> **Project status:** The product behavior below is the intended design. Only the
> local Phase 1 scaffold is implemented and tested; transfer features, provider
> integrations, and deployment are not implemented or verified.

## Product goals

- No account or app installation required for the basic flow.
- Cross-network transfer using a cloud relay, not a same-Wi-Fi-only assumption.
- Multiple-file upload and mobile-first download page.
- Short-lived transfers with server-enforced expiry and deletion.
- Distinctive, carefully engineered UI with honest progress and real states.
- Privacy-conscious defaults and verifiable behavior.

## Current status

- [x] Stack decision approved (2026-10-25)
- [x] Repository scaffold created
- [x] Local frontend starts
- [x] Local API starts
- [ ] Database migrations apply
- [ ] Object storage integration works
- [ ] Create transfer works end-to-end
- [ ] Phone download works end-to-end
- [ ] Expiry and delete verified
- [ ] Deployment limits and costs reviewed
- [ ] Production deployment manually verified

Private planning and agent-guidance documents are maintained separately and are
intentionally not included in this repository.

## Stack (Approved 2026-10-25)

- **Frontend:** React + Vite + TypeScript (hosted on Render Static Site)
- **Backend:** Python + FastAPI (hosted on Render Free Web Service)
- **Database:** Supabase PostgreSQL Free (metadata)
- **File Storage:** Private Supabase Storage (browser-direct uploads via signed URLs)
- **Budget:** Strictly ₹0, no payment method required, no paid upgrades or add-ons

## Repository layout

```text
droplink/
├── README.md
├── .gitignore
├── .env.example
├── frontend/   # React + Vite + TypeScript
└── backend/    # Python + FastAPI
```

## Local development

The Phase 1 scaffold uses no database, Supabase project, credentials, or deployment
configuration. `/healthz` is a process-level liveness check only; it does not check
database or storage readiness.

### Frontend

Requires Node.js 20.19 or newer.

```powershell
cd frontend
npm ci
npm run dev
```

Run the frontend checks from `frontend/`:

```powershell
npm run lint
npm run format:check
npm test
npm run build
```

### Backend

Requires Python 3.11 or newer. From the repository root, create and activate a
virtual environment, then install the project and its development tools:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

Start the local API from `backend/`:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, run the backend checks from `backend/`:

```powershell
python -m ruff check .
python -m ruff format --check .
python -m pytest
```

The liveness endpoint is `http://127.0.0.1:8000/healthz` and returns
`{"status":"ok"}`.

## Security and privacy

Do not commit secrets. Do not store file bytes in the metadata database. Do not expose permanent public object URLs. Enforce expiry at request time, not only through cleanup. Never claim guaranteed permanent deletion without provider evidence.

## Contribution/agent rule

Only one agent owns implementation files at a time. Every completed task must include:
1. summary of changed files,
2. exact commands run,
3. real output and test results,
4. acceptance criteria status,
5. known limitations,
6. a clear stop for user review.

Before moving to another implementation phase, report changed files, actual
verification results, and known limitations, then wait for review.
