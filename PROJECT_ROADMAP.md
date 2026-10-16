# SmartResolve AI — PROJECT ROADMAP

## Project Overview
SmartResolve AI is a full-stack e-commerce customer-support web application powered by a multi-step, prompt-engineered AI pipeline. It classifies intent, detects sentiment and urgency, extracts context, retrieves relevant policies, recommends resolutions, generates responses, validates them with an AI critic, and escalates complex cases to human agents.

---

## Documentation Inspected
| File | Status |
|---|---|
| `Documentation/SmartResolve AI — Complete Documentation.docx` | Read in full (766 lines, all 100 specification sections) |
| `AGENTS.md` | Read — frontend rules directive |
| `CLAUDE.md` | Read — frontend rules directive |
| `FRONTEND_RULES.md` | Read — currently empty |

---

## Architecture Summary

```
CLIENT (HTML + CSS + Vanilla JS)
    └── Fetch API calls
BACKEND (Node.js + Express.js)
    ├── Routes → Controllers → Services
    ├── SmartResolve Engine (9-step AI pipeline)
    │   ├── Intent Agent
    │   ├── Sentiment Agent
    │   ├── Urgency Agent
    │   ├── Context Agent
    │   ├── Policy Agent
    │   ├── Resolution Agent
    │   ├── Response Agent
    │   ├── Critic Agent
    │   └── Escalation Agent
    ├── LLM Provider (OpenAI / Gemini — configurable via .env)
    └── MongoDB (via Mongoose)
```

---

## Technology Stack
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Fetch API, Chart.js (CDN) |
| Backend | Node.js 20+, Express.js |
| Database | MongoDB + Mongoose |
| AI / LLM | OpenAI API (primary), Gemini (alternative), configurable via .env |
| Auth | JWT + bcryptjs |
| Security | helmet, cors, express-rate-limit |
| Logging | morgan + custom logger |
| Dev | nodemon |

---

## Key Architectural Decisions
1. HTML/CSS/JS/React frontend per spec
2. Modular AI pipeline — each agent is a separate service file; no monolithic prompt
3. Prompts stored separately in server/prompts/ — enables versioning and evaluation
4. LLM abstracted behind llmService.js — provider swappable via .env
5. Policy retrieved from MongoDB — modular, supports vector DB upgrade later
6. JWT auth with role-based middleware (requireCustomer, requireAgent, requireAdmin)
7. Demo/mock mode when no API key is configured — responses use realistic local fallback
8. Seed script populates 10 customers, 20 products, 50 orders, 10 policies, 20 conversations
9. No API keys in frontend — all LLM calls go through Express backend
10. CSS variables for consistent theming across all pages

---

## Phase 1 — Foundation & Project Setup

**Objective:** Establish the complete project skeleton, configuration, database models, authentication system, and seed data.

**Features & Modules:**
- Root project structure (client/, server/, data/, policies/, tests/)
- package.json with all dependencies
- .env.example and .gitignore
- server/config/db.js and server/config/env.js
- All 9 Mongoose models: User, Product, Order, Conversation, Message, AIAnalysis, Policy, Escalation, PromptVersion
- JWT authentication routes + controllers + middleware
- Seed script with realistic demo data
- Utility files and middleware
- Basic Express server with CORS, helmet, morgan, rate-limiting

**Status: COMPLETED (Verified with 10/10 automated tests)**

**Acceptance Criteria Verification:**
- [x] Project installs with npm install (package.json cleaned, dependencies verified)
- [x] npm run dev / server starts without errors (verified live /health on port 5000)
- [x] MongoDB connects successfully (connected to mongodb://127.0.0.1:27017/smartresolve)
- [x] All 9 models exist with correct schemas (verified via Mongoose queries)
- [x] JWT auth register/login works (verified with bcrypt hashing and token verification)
- [x] Seed script populates all collections (13 users, 20 products, 50 orders, 10 policies, 20 conversations, 40 messages, 20 analyses, 5 prompt versions)
- [x] .env is gitignored (confirmed in .gitignore)

---

## Phase 2 — Core AI Pipeline (Backend Services)

**Objective:** Implement the complete 9-step AI pipeline as separate backend services, the LLM abstraction layer, all AI prompts, and the primary support API endpoint.

**Services:** llmService, intentService, sentimentService, urgencyService, contextService, policyService, resolutionService, responseService, criticService, escalationService

**Prompts:** intentPrompt, sentimentPrompt, urgencyPrompt, contextPrompt, policyPrompt, resolutionPrompt, responsePrompt, criticPrompt

**Status: COMPLETED (Verified with 16/16 automated tests & live pipeline validation)**

**Acceptance Criteria Verification:**
- [x] All 9 pipeline steps execute in order (intent -> sentiment -> urgency -> context -> policy -> resolution -> escalation -> response -> critic)
- [x] Each service returns structured JSON (with schema validation & resilient JSON parsing)
- [x] LLM errors handled gracefully (custom error codes, retry logic on critic rejection)
- [x] Live LLM API support (OpenAI gpt-4o-mini & Google Gemini gemini-1.5-flash via @google/generative-ai)
- [x] Escalation triggers correctly (confidence < 0.70, CRITICAL urgency, security/fraud, human agent requests)
- [x] Prompt injection blocked (system prompt leak / jailbreak patterns intercepted immediately)
- [x] AI analysis saved to DB (AIAnalysis model, Message model with metadata, Escalation model with valid enums)
- [x] Conversation endpoints functioning (POST /api/support/conversation/start, POST /api/support/message, GET /api/support/conversation/:id/history)

---

## Phase 3 — Remaining Backend APIs

**Objective:** Build all remaining Express routes: orders, conversations, policies, escalations, analytics, evaluation.

**Routes:** orderRoutes, conversationRoutes, policyRoutes, escalationRoutes, analyticsRoutes, evaluationRoutes

**Status: NOT STARTED**

**Acceptance Criteria:**
- GET /api/orders returns seeded orders
- GET /api/policies returns all policies
- PATCH /api/escalations/:id updates status
- GET /api/analytics returns all 7 metric categories
- POST /api/evaluation/run produces evaluation report
- All routes protected by appropriate auth middleware

---

## Phase 4 — Frontend (All Pages & UI)

**Objective:** Build all 10 HTML pages with CSS and JavaScript, fully connected to the backend.

**Pages:** index.html, login.html, customer.html, orders.html, agent-dashboard.html, conversation.html, analytics.html, policies.html, prompt-evaluation.html, admin.html

**Status: NOT STARTED**

**Acceptance Criteria:**
- All 10 pages load without errors
- Customer chat sends messages and receives AI responses
- Loading/typing indicator shows during AI processing
- AI analysis panel is expandable
- Agent dashboard shows escalated cases
- Analytics page shows 6 Chart.js charts
- Policy CRUD works from policies page
- Fully responsive on mobile/tablet/desktop

---

## Phase 5 — Testing, Polish & Finalization

**Objective:** Write and run tests, fix bugs, complete README, verify all 29 acceptance criteria.

**Status: NOT STARTED**

**Acceptance Criteria:**
- All test files pass
- Intent accuracy >= 90% on test cases
- Escalation triggers on all defined conditions
- Prompt injection blocked on all test inputs
- No API keys in frontend
- Rate limiting active and tested
- All 29 spec acceptance criteria verified
- README is complete

---

## Requirement-to-Phase Traceability Matrix

| Spec Section | Requirement | Phase |
|---|---|---|
| 3 | Technology stack | 1 |
| 4 | Architecture | 1 |
| 5 | User roles | 1 |
| 6-19 | Frontend pages | 4 |
| 20-21 | Backend API + support endpoint | 2-3 |
| 22-29 | MongoDB schemas | 1 |
| 31-41 | AI services | 2 |
| 42-50 | Prompt files | 2 |
| 51-56 | Policy rules | 2 |
| 57 | Prompt injection protection | 2+5 |
| 58-59 | Frontend design + responsive | 4 |
| 60-61 | Folder structures | 1+4 |
| 63 | Environment variables | 1 |
| 64 | JWT auth | 1 |
| 65-66 | Security | 1+5 |
| 67-68 | Seed data | 1 |
| 69 | End-to-end AI workflow | 2 |
| 77-79 | Evaluation system | 3 |
| 80 | Prompt engineering techniques | 2 |
| 82-86 | Error handling, logging, rate limiting | 1+3 |
| 87-89 | Escalation UI | 4 |
| 90 | Test cases | 5 |
| 91 | Demo scenarios | 2+5 |
| 98 | Final acceptance criteria | 5 |

---

## Known Risks & Assumptions
| Risk | Mitigation |
|---|---|
| LLM API key unavailable during development | Demo/mock mode in llmService.js |
| MongoDB not installed locally | Document setup in README |
| Chart.js CDN dependency | Use specific CDN version |
| Token cost of 9-step pipeline | Demo mode for development |
| FRONTEND_RULES.md is currently empty | Populate in Phase 4 |
| Gemini vs OpenAI format differences | llmService.js abstracts both |
