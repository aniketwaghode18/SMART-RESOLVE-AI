# SmartResolve AI: New Device Setup Guide (From Scratch)

This guide provides end-to-end instructions for installing, configuring, and running the SmartResolve AI project on any new device (Windows, macOS, or Linux) from a clean state.

---

## 1. System Requirements

### Hardware Requirements
- **Memory**: Minimum 4 GB RAM (8 GB or more recommended)
- **Disk Space**: At least 1 GB of free disk space
- **Architecture**: x64, x86_64, or ARM64 (Apple Silicon M-series supported)

### Software Requirements
- **Node.js**: v18.0.0 or higher (v20 LTS recommended)
- **npm**: v9.0.0 or higher (comes bundled with Node.js)
- **MongoDB**: Community Server v6.0 or higher (or a free MongoDB Atlas cloud cluster)
- **Git**: Latest stable release
- **Web Browser**: Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari

---

## 2. Installing Required Tools

Follow the instructions for your operating system.

### Option A: Windows

#### 1. Install Node.js
1. Visit the official download page: https://nodejs.org/
2. Download the **LTS (Long Term Support)** Windows Installer (.msi).
3. Run the installer, accept the license, keep default paths, and ensure **"Add to PATH"** is checked.
4. Verify installation in PowerShell:
   ```powershell
   node -v
   npm -v
   ```
   *Both commands should print their version numbers.*

#### 2. Install Git
1. Download Git for Windows: https://git-scm.com/download/win
2. Run the installer using default recommended options.
3. Verify in PowerShell:
   ```powershell
   git --version
   ```

#### 3. Install MongoDB Community Server
1. Download MongoDB Community Server (.msi):
   https://www.mongodb.com/try/download/community
2. Run the installer:
   - Choose **Complete** setup.
   - Select **"Run Service as a Network Service user"** (Default).
   - Check **"Install MongoDB as a Service"** (this keeps MongoDB running in the background automatically).
   - Optional: Install **MongoDB Compass** (graphical database viewer).
3. Verify that the MongoDB service is running:
   ```powershell
   Get-Service -Name MongoDB
   ```
   *Status should say `Running`.* If not running, start it:
   ```powershell
   net start MongoDB
   ```

---

### Option B: macOS

#### 1. Install Homebrew (if not already installed)
Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Install Node.js, Git, and MongoDB
Run the following commands in Terminal:
```bash
# Install Node.js and Git
brew install node git

# Tap MongoDB Homebrew repository
brew tap mongodb/brew

# Install and start MongoDB
brew install mongodb-community
brew services start mongodb-community
```

#### 3. Verify Installations
```bash
node -v
npm -v
git --version
brew services list
```
*MongoDB should show status `started`.*

---

### Option C: Linux (Ubuntu / Debian)

#### 1. Install Node.js & Git
```bash
sudo apt update
sudo apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 2. Install and Start MongoDB
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install packages
sudo apt update
sudo apt install -y mongodb-org

# Start and enable service
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

---

### Alternative: Free MongoDB Atlas Cloud Database (No Local Installation)
If you prefer not to install MongoDB locally:
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a free **M0 Sandbox** cluster.
3. Create a database user (username and password).
4. Add `0.0.0.0/0` to Network Access (IP Whitelist) for development.
5. Copy your connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/smartresolve?retryWrites=true&w=majority`).
6. You will paste this into your `.env` file in Step 4.

---

## 3. Getting the Project Files and Installing Dependencies

### Step 1: Open Your Terminal
- **Windows**: PowerShell or Windows Terminal
- **macOS / Linux**: Terminal

### Step 2: Navigate to the Project Directory
If cloning from a Git repository:
```bash
git clone https://github.com/aniketwaghode18/SMART-RESOLVE-AI.git
cd SMART-RESOLVE-AI
```
Or navigate into your extracted project directory:
```bash
cd "path/to/SmartResolve AI"
```

### Step 3: Install Node Packages
Install all production and development dependencies:
```bash
npm install
```
*This installs Express, Mongoose, @google/generative-ai, OpenAI SDK, bcryptjs, jsonwebtoken, helmet, cors, jest, and supertest.*

---

## 4. Configuring Environment Variables

### Step 1: Create the `.env` File
Copy the example file to create your active `.env` file:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

### Step 2: Edit `.env` Values
Open the `.env` file in your preferred text editor (e.g., VS Code, Notepad, Nano):

```ini
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection String
# Use 127.0.0.1 for local MongoDB, or paste your MongoDB Atlas URI
MONGODB_URI=mongodb://127.0.0.1:27017/smartresolve

# LLM Provider Configuration
# Options: gemini | openai | demo
LLM_PROVIDER=gemini

# Google Gemini API Configuration (Recommended)
# Get a free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# OpenAI API Configuration (Optional alternative)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Authentication Security
# Replace with any long random 32+ character string
JWT_SECRET=super_secret_jwt_key_smartresolve_ai_2026_secure

# Rate Limiting & Safety
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

### Understanding LLM Provider Modes:
1. **`LLM_PROVIDER=gemini` (Recommended for live AI)**:
   - Uses Google Gemini API (`gemini-3.5-flash`).
   - Get a free API key at **https://aistudio.google.com/app/apikey**.
   - Generous free tier with fast inference.
2. **`LLM_PROVIDER=demo` (Zero-cost, 100% offline mode)**:
   - If you do not have an internet connection or API keys yet, set `LLM_PROVIDER=demo`.
   - The entire 9-step pipeline (intent, sentiment, urgency, policies, resolution, critic, responses) runs instantly using built-in deterministic simulation logic.
3. **`LLM_PROVIDER=openai`**:
   - Uses OpenAI API (`gpt-4o-mini`). Requires funded OpenAI platform key.

---

## 5. Seeding the Database

Populate your database with realistic demo data:
```bash
npm run seed
```

### What This Generates:
- **13 Users**: 10 customers (Bronze, Silver, Gold, Platinum tiers), 2 support agents, 1 admin.
- **20 Products**: Electronics, Home, Kitchen, Sports, Bags, Furniture.
- **50 Orders**: Varied order lifecycles (PROCESSING, SHIPPED, DELIVERED, OUT_FOR_DELIVERY, etc.).
- **10 Store Policies**: Returns, Refunds, Cancellations, Shipping, Defective items, Warranty, and Security.
- **20 Conversations & 40 Messages**: Sample chat history with AI analysis records.
- **5 Prompt Versions**: Benchmark versions for prompt engineering evaluation.

*Note: All seeded users share the same password: `password123`.*

---

## 6. Running the Application

### Development Mode (with Live Reload)
```bash
npm run dev
```
*Expected Console Output:*
```
[nodemon] starting `node server/server.js`
[INFO] MongoDB Connected: 127.0.0.1
[INFO] SmartResolve AI server running | {"port":5000,"env":"development","llmProvider":"gemini"}
```

### Production Mode
```bash
npm start
```

### Automated Testing
To run the automated Jest test suite anytime:
```bash
npm test
```
*Expected output: 4 passed test suites, 37/37 tests passed (100%).*

---

## 7. Accessing the Web Application

Open your browser and navigate to:
```
http://localhost:5000
```

### Ready-to-Use Accounts

| Role | Email | Password | Intended Page | Features Available |
|---|---|---|---|---|
| **Customer** | `rahul@example.com` | `password123` | `customer.html`, `orders.html` | AI Chat, Order Tracking, AI Reasoning Inspector |
| **Agent** | `priya@smartresolve.ai` | `password123` | `agent-dashboard.html`, `conversation.html` | Escalated Tickets Queue, Ticket Takeover, Resolution |
| **Admin** | `admin@smartresolve.ai` | `password123` | `admin.html`, `analytics.html`, `policies.html`, `prompt-evaluation.html` | Analytics Charts, Policy CRUD, Benchmark Evaluation |

> **Convenience Feature**: On `http://localhost:5000/login.html`, click any of the 3 quick-fill buttons to populate credentials with a single click.

---

## 8. Troubleshooting Common Issues

### Issue 1: MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)
- **Cause**: The local MongoDB service is not currently running.
- **Fix on Windows**:
  1. Press `Win + R`, type `services.msc`, and press Enter.
  2. Locate **MongoDB Server**, right-click, and select **Start**.
  3. Or run PowerShell as Administrator:
     ```powershell
     net start MongoDB
     ```
- **Fix on macOS**:
  ```bash
  brew services restart mongodb-community
  ```
- **Fix on Linux**:
  ```bash
  sudo systemctl restart mongod
  ```

### Issue 2: `Port 5000 is already in use`
- **Cause**: Another process or previous server instance is occupying port 5000.
- **Fix Option 1 (Change Port)**:
  Open `.env` and change `PORT=5000` to `PORT=5001`. Then access the app at `http://localhost:5001`.
- **Fix Option 2 (Terminate Process on Windows)**:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
  ```
- **Fix Option 2 (Terminate Process on macOS / Linux)**:
  ```bash
  lsof -ti :5000 | xargs kill -9
  ```

### Issue 3: PowerShell Script Execution Policy Error on Windows
- **Error**: `File ... nodemon.ps1 cannot be loaded because running scripts is disabled on this system.`
- **Fix**: Run this command once in PowerShell to allow locally created scripts:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

### Issue 4: Gemini API 429 Error or Quota Limit
- **Cause**: Google Gemini API key has exceeded rate limits.
- **Fix**: Temporarily switch to offline mode in `.env`:
  ```ini
  LLM_PROVIDER=demo
  ```
  Restart the server with `npm run dev`. Everything will work offline without requiring internet access or API quota.

---

## 9. Verification Checklist

Complete this quick checklist to ensure your new device setup is 100% operational:

- [ ] Node.js (v18+) and MongoDB are installed and active.
- [ ] `npm install` completed with zero errors.
- [ ] `.env` file exists with valid `MONGODB_URI`, `LLM_PROVIDER`, and `JWT_SECRET`.
- [ ] `npm run seed` finished successfully.
- [ ] `npm run dev` starts without throwing errors.
- [ ] Browser loads `http://localhost:5000`.
- [ ] Customer login works (`rahul@example.com` / `password123`).
- [ ] Chat responds to questions with the live AI reasoning inspector updating.
- [ ] Admin pages render all 6 Chart.js graphs at `http://localhost:5000/analytics.html`.
- [ ] Automated tests pass: `npm test` shows 37/37 passing.
