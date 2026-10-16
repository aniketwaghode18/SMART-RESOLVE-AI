# SmartResolve AI

**Self-Diagnosing, Emotion-Aware & Policy-Grounded E-Commerce Customer Support System**

> A full-stack web application powered by a 9-step prompt-engineered AI pipeline.

---

## Overview
SmartResolve AI is an intelligent e-commerce customer-support platform. Unlike a basic chatbot, it uses a structured AI pipeline to analyze customer messages through intent detection, sentiment analysis, urgency detection, context extraction, policy retrieval, resolution recommendation, response generation, AI critic validation, and human escalation.

---

## Technology Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **AI:** OpenAI / Gemini LLM (configurable), Demo mode
- **Auth:** JWT + bcryptjs
- **Security:** helmet, cors, express-rate-limit

---

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (running locally on port 27017)

### Installation
`ash
# Clone/download the project
cd smartresolve-ai

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env — set LLM_PROVIDER=demo for development without API key
# Or set OPENAI_API_KEY for real AI responses

# Seed demo data
npm run seed

# Start development server
npm run dev
`

The application will be available at http://localhost:5000

---

## Demo Accounts (after seeding)
| Role | Email | Password |
|---|---|---|
| Admin | admin@smartresolve.ai | password123 |
| Agent | priya@smartresolve.ai | password123 |
| Customer | rahul@example.com | password123 |

---

## Available Scripts
| Script | Command | Description |
|---|---|---|
| Install | 
pm install | Install all dependencies |
| Development | 
pm run dev | Start with nodemon (auto-reload) |
| Production | 
pm start | Start production server |
| Seed Data | 
pm run seed | Populate MongoDB with demo data |
| Tests | 
pm test | Run test suite |

---

## Project Structure
`
smartresolve-ai/
├── client/              # Frontend (HTML + CSS + JavaScript)
├── server/              # Backend (Node.js + Express)
│   ├── config/          # Database and environment config
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── controllers/     # Request handlers
│   ├── services/        # AI pipeline services (9 agents)
│   ├── prompts/         # LLM prompt templates
│   ├── middleware/      # Auth, error, validation
│   ├── utils/           # Logger, validators, helpers
│   ├── evaluation/      # Prompt evaluation system
│   └── seed.js          # Demo data seeder
├── data/                # Static data files
├── policies/            # Policy text files
├── tests/               # Test suite
├── .env.example         # Environment template
└── package.json
`

---

## AI Pipeline
Every customer message goes through this pipeline:
1. **Intent Detection** — Classifies the customer's intent (20+ intents)
2. **Sentiment Analysis** — Detects emotional state (8 categories)
3. **Urgency Detection** — Determines urgency level (LOW/MEDIUM/HIGH/CRITICAL)
4. **Context Extraction** — Extracts order IDs, product names, problem details
5. **Policy Retrieval** — Finds the relevant company policy from MongoDB
6. **Resolution Recommendation** — Determines the appropriate action
7. **Response Generation** — Creates a policy-grounded, empathetic response
8. **Critic Validation** — Validates the response for safety and accuracy
9. **Escalation Decision** — Escalates to human agents when appropriate

---

## User Roles
- **Customer** — Chat interface, order tracking, conversation history
- **Support Agent** — Escalated case management, AI analysis view, manual response
- **Admin** — Analytics, policy management, prompt evaluation, full oversight

---

## LLM Configuration
Set LLM_PROVIDER in .env:
- demo — Use realistic mock responses (no API key needed)
- openai — Use OpenAI API (requires OPENAI_API_KEY)
- gemini — Use Google Gemini API (requires GEMINI_API_KEY)

---

*SmartResolve AI — Phase 1 Foundation Complete*
