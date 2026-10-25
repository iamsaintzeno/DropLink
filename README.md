# DropLink

Temporary PC-to-phone file sharing without accounts. Select files on a PC, get a QR code and short code, then open the transfer on a phone and download the files before expiry.

> **Planning scaffold:** This repository documentation describes intended behavior. It does not mean the application has been implemented, deployed, or tested yet.

## Product goals

- No account or app installation required for the basic flow.
- Cross-network transfer using a cloud relay, not a same-Wi-Fi-only assumption.
- Multiple-file upload and mobile-first download page.
- Short-lived transfers with server-enforced expiry and deletion.
- Distinctive, carefully engineered UI with honest progress and real states.
- Privacy-conscious defaults and verifiable behavior.

## Current status

- [ ] Stack decision approved
- [ ] Repository scaffold created
- [ ] Local frontend starts
- [ ] Local API starts
- [ ] Database migrations apply
- [ ] Object storage integration works
- [ ] Create transfer works end-to-end
- [ ] Phone download works end-to-end
- [ ] Expiry and delete verified
- [ ] Deployment limits and costs reviewed
- [ ] Production deployment manually verified

## Documentation map

- [`MASTER_PLAN.md`](MASTER_PLAN.md) — product, architecture, security, visual quality bar, agent ownership.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — open decisions and evidence requirements.
- [`docs/CONTRACTS.md`](docs/CONTRACTS.md) — proposed API and lifecycle contracts.
- [`docs/PHASES.md`](docs/PHASES.md) — guided, phase-gated build sequence.
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md) — evidence rules, tests, manual end-to-end checks.
- [`docs/SECURITY.md`](docs/SECURITY.md) — threat model and security checklist.
- [`docs/DESIGN_BRIEF.md`](docs/DESIGN_BRIEF.md) — visual/product interaction direction.
- [`prompts/`](prompts/) — reusable instructions for each agent.

## Stack

Not finalized. The current candidate is React + Vite + TypeScript, FastAPI, PostgreSQL, and private S3-compatible object storage. See `docs/DECISIONS.md` before implementation. No hosting provider is assumed to be selected.

## Intended repository layout

```text
droplink/
├── README.md
├── MASTER_PLAN.md
├── AGENTS.md
├── .env.example
├── docs/
│   ├── DECISIONS.md
│   ├── CONTRACTS.md
│   ├── PHASES.md
│   ├── VERIFICATION.md
│   ├── SECURITY.md
│   └── DESIGN_BRIEF.md
├── prompts/
│   ├── CODEX.md
│   ├── COPILOT.md
│   ├── GEMINI.md
│   ├── CLAUDE.md
│   └── ANTIGRAVITY.md
├── frontend/   # create during approved scaffold phase
└── backend/    # create during approved scaffold phase
```

The tree is a target layout, not a claim that these code directories already exist.

## Proposed local workflow

Exact commands depend on the approved stack and generated project files. Once Phase 1 is approved, document the actual commands here. Do not paste placeholder commands and present them as verified.

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

See `AGENTS.md`.
