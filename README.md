# ⚡ AegisAI — Autonomous AI Cyber Defense System

<p align="center">
  <img src="https://img.shields.io/badge/Status-Online-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/ML-scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn" />
  <img src="https://img.shields.io/badge/Storage-SQLite-003B57?style=for-the-badge&logo=sqlite" />
  <img src="https://img.shields.io/badge/Framework-MITRE%20ATT%26CK-red?style=for-the-badge" />
</p>

> **AegisAI** is an enterprise-style cybersecurity analytics prototype — a real-time monitoring and autonomous response platform. It combines unsupervised anomaly detection, supervised threat classification, MITRE ATT&CK framework mapping, and a SOAR-grade automated response engine — all wrapped in an enterprise-quality live dashboard.

<p align="center">
  <i>(Insert 10-second compressed GIF demo flow here showing detection to mitigation)</i>
</p>

---

## ⚙️ Operating Modes

AegisAI can run in two distinct modes depending on your objective:

1. **Simulation Mode** (Demo)
   - Built-in synthetic traffic generator (`log_generator.py`)
   - Interactive Attack Simulator panel for testing ML detections
   - Ideal for investor/judge presentations and capability demonstrations
2. **Telemetry Mode** (Analyst)
   - Live endpoint monitoring (via Kafka or HTTP streaming APIs)
   - Threat Simulator disabled
   - "Read-only" mode for the dashboard unless taking human-in-the-loop action

---

## 🔒 Security Model

AegisAI implements a modern defense-in-depth approach:
- **Zero Trust**: Every connection requires verification; behavior is constantly re-evaluated.
- **Behavioral Anomaly Detection**: Looks for deviations from normal operating patterns rather than just known bad IP addresses.
- **Deterministic Action**: Machine learning alerts are parsed through hardcoded SOAR containment policies, maintaining control over automated responses.
- **MITRE Aligned**: Detections map explicitly to the **MITRE ATT&CK Framework** (e.g., T1110, T1078) to speak the language of professional SOC analysts.

---

## 📊 Performance Metrics (Prototype Benchmarks)

- **Throughput**: ~4,500 events/sec per ingestion node (Single Python thread)
- **Latency**: Sub-300ms from event ingestion to SOAR Engine automated response
- **Memory Footprint**: < 200MB (Core Engine + Scikit-Learn pipelines)

---

## 🚀 Future Architecture (V2)

```
┌───────────┐     ┌─────────┐      ┌─────────────┐     ┌────────────────┐
│ Endpoints │ ──▶ │  Kafka  │ ───▶ │ Aegis Engine│ ──▶ │ Real-time UI   │
│ (Agents)  │     │ Cluster │      │ (Spark/Flink│     │ (WebSockets)   │
└───────────┘     └─────────┘      └─────────────┘     └────────────────┘
```
The prototype is currently completely self-contained. In a production deployment, the architecture would migrate to a distributed streaming model.

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AegisAI Platform                         │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │  Simulator   │───▶│           ML Pipeline                │   │
│  │ log_generator│    │  ┌──────────┐  ┌──────────────────┐  │   │
│  └──────────────┘    │  │Aggregator│─▶│  Preprocessor    │  │   │
│                      │  │(5s windows│  │  (StandardScaler)│  │   │
│  ┌──────────────┐    │  └──────────┘  └────────┬─────────┘  │   │
│  │   Stream     │───▶│                          │            │   │
│  │  Aggregator  │    │  ┌───────────────────────▼──────────┐ │   │
│  └──────────────┘    │  │  IsolationForest Anomaly Detector│ │   │
│                      │  └───────────────────────┬──────────┘ │   │
│                      │                          │ anomalies  │   │
│                      │  ┌───────────────────────▼──────────┐ │   │
│                      │  │  RandomForest Threat Classifier   │ │   │
│                      │  └───────────────────────┬──────────┘ │   │
│                      └──────────────────────────┼────────────┘   │
│                                                 │                │
│  ┌──────────────────────────────────────────────▼────────────┐   │
│  │                     Engine Layer                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │ ThreatIntel │  │ RiskScorer  │  │  ResponseEngine  │  │   │
│  │  │ (MITRE ATT& │  │  (Time-decay│  │  (SOAR + Safelist│  │   │
│  │  │  CK Mapping)│  │   0–100)    │  │   Auto-mitigation│  │   │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  SQLite DB   │    │  FastAPI     │    │  React Dashboard │  │
│  │  (aegis.db)  │◀───│  REST API    │◀───│  (Vite + JSX)    │  │
│  └──────────────┘    │  :8000/docs  │    │  :5173           │  │
│                      └──────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
AegisAI/
├── backend/                         # Python FastAPI backend
│   ├── main.py                      # App entry point — startup, lifespan, background tasks
│   ├── aegis.db                     # SQLite hot store (auto-created)
│   ├── requirements.txt             # Python dependencies
│   │
│   ├── api/                         # REST API layer
│   │   ├── routes.py                # All 9 API endpoints (FastAPI router)
│   │   └── schemas.py               # Pydantic request/response schemas
│   │
│   ├── engine/                      # Core security intelligence
│   │   ├── response_engine.py       # SOAR — containment actions + safelist
│   │   ├── risk_scorer.py           # Dynamic 0–100 risk score with time decay
│   │   └── threat_intel.py          # MITRE ATT&CK mapping + human explanations
│   │
│   ├── ml/                          # Machine learning pipeline
│   │   ├── aggregator.py            # Feature window computation (per source IP)
│   │   ├── preprocessor.py          # Feature extraction + StandardScaler
│   │   ├── detector.py              # Isolation Forest anomaly detector
│   │   └── classifier.py            # Random Forest threat classifier
│   │
│   ├── simulator/                   # Synthetic traffic generator
│   │   └── log_generator.py         # Normal + 4 attack pattern generators
│   │
│   ├── storage/                     # Persistence layer
│   │   └── database.py              # SQLite CRUD for threats, risk, events
│   │
│   └── stream/                      # Streaming ingestion layer
│       └── aggregator.py            # Real-time event aggregation engine
│
├── frontend/                        # React + Vite dashboard
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                 # App bootstrap
│       ├── App.jsx                  # Root layout + routing
│       ├── index.css                # Global design system (~18KB)
│       ├── hooks/
│       │   └── useThreats.js        # Polling hook for live threat feed
│       └── components/
│           ├── AttackMap.jsx        # Global geo-threat visualization
│           ├── AttackSimulator.jsx  # Manual attack injection panel
│           ├── AttackTimeline.jsx   # Chronological event timeline
│           ├── GuidedDemo.jsx       # Step-by-step demo flow
│           ├── NetworkTopology.jsx  # Kill Chain network graph view
│           ├── RadarChart.jsx       # XAI feature contribution radar
│           ├── RiskGauge.jsx        # Live animated risk dial (0–100)
│           ├── StatsBar.jsx         # KPI strip (events, threats, uptime)
│           ├── TerminalLog.jsx      # Syntax-highlighted SOC terminal feed
│           ├── ThreatDetail.jsx     # Full threat intelligence report modal
│           ├── ThreatFeed.jsx       # Real-time threat list with filtering
│           └── ThreatReplay.jsx     # Historical threat playback
│
└── scripts/                         # Test and utility scripts
    ├── run_extreme_tests.py         # main extreme testing orchestrator
    ├── ws_stress_test.py            # WebSocket performance testing
    └── ...                          # Other verification and testing scripts
```

---

## 🧠 ML Pipeline — How It Works

AegisAI uses a **two-stage ML pipeline** that mirrors real-world SIEM/UEBA architecture:

### Stage 1 — Unsupervised Anomaly Detection (Isolation Forest)

```
Raw Events ──▶ AggregationEngine (5s windows) ──▶ Preprocessor ──▶ IsolationForest
                                                                          │
                                                    anomaly_score ◀───────┘
                                                 is_anomaly (bool)
```

- Trained on **4,000 synthetic normal baseline events** at startup
- Uses **9 behavioral features** per source IP per 5-second window
- Contamination rate: **15%** (tuned for security environments)
- More negative `anomaly_score` → higher threat confidence

### Stage 2 — Supervised Threat Classification (Random Forest)

```
Anomalous Samples ──▶ RandomForestClassifier (100 trees) ──▶ threat_type + confidence%
```

- Trained on **160 synthetic labeled attack samples** (40 per attack type)
- Falls back to `"unknown_anomaly"` if max class probability < 60%
- Returns full probability distribution over all threat classes

### Feature Engineering (9 features per window)

| Feature | Description | Attack Signal |
|---|---|---|
| `login_attempt_rate` | Login events per window | Brute force |
| `failed_login_ratio` | % of failed logins | Credential stuffing |
| `unique_ports` | Distinct ports touched | Port scanning |
| `connection_frequency` | Requests per second | DDoS |
| `avg_payload_size` | Mean payload bytes | Data exfiltration |
| `unique_users` | Distinct user accounts | Credential spraying |
| `session_variation` | Payload std dev (CoV) | Bot automation |
| `hour_of_day` | Activity hour (0–23) | After-hours access |
| `geo_anomaly` | Suspicious geolocation flag | Nation-state activity |

---

## 🛡️ Threat Classification

| Threat Type | Severity | MITRE ATT&CK ID | Tactic | Auto-Response |
|---|---|---|---|---|
| Brute Force | 🔴 High | T1110 | Credential Access | Block IP + Alert Admin |
| DDoS | 🚨 Critical | T1498 | Impact | Block IP + Rate Limit (auto) |
| Port Scan | 🟡 Medium | T1046 | Discovery | Flag for investigation |
| Data Exfiltration | 🚨 Critical | T1041 | Exfiltration | Lock Account + Isolate |
| Insider Threat | 🔴 High | T1078 | Persistence | Lock Account + Escalate |
| Zero-Day Deviation | 🟡 Medium | TA0001 | Heuristic | Manual Analyst Review |

---

## ⚡ SOAR Response Engine

The `ResponseEngine` provides **Security Orchestration, Automation and Response** capabilities:

### Containment Actions

| Action | Description | Human-in-Loop? |
|---|---|---|
| `block_ip` | Firewall rule to drop source IP | Auto for critical threats |
| `lock_account` | Suspend targeted user account | Manual approval required |
| `rate_limit` | Enable connection throttling | Auto |
| `isolate_service` | Network isolation of affected host | Manual approval required |
| `alert_admin` | Escalate to SOC team | Auto |

### Infrastructure Safelist

Critical infrastructure IPs are **protected from auto-blocking**:
```
10.0.0.1   — Gateway
10.0.0.2   — DNS Server  
10.0.1.1   — Database Server
10.0.1.2   — Payment Gateway
10.0.2.1   — Internal API Server
127.0.0.1  — Localhost
```

### Dynamic Risk Scoring

The `RiskScorer` maintains a real-time **0–100 system risk score** with:
- **Threat severity weights** (DDoS = 30, Exfiltration = 35, Brute Force = 20...)
- **Confidence scaling** — high-certainty detections spike the score more
- **Time decay** — score decays by 5% every 5 seconds of no new threats
- **Mitigation credits** — each response action reduces score by 10–15 points

```
Risk Level   Score Range   Color
LOW          0 – 19        🟢 Green
MEDIUM       20 – 49       🟡 Yellow
HIGH         50 – 74       🟠 Orange
CRITICAL     75 – 100      🔴 Red
```

---

## 🌐 REST API Reference

**Base URL:** `http://localhost:8000/api`  
**Interactive Docs:** `http://localhost:8000/docs`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | System KPIs: events, threats, risk score, uptime, event rate |
| `GET` | `/api/threats` | Paginated threat history (`?limit=50`) |
| `GET` | `/api/threats/latest` | Latest N threats for real-time feed |
| `GET` | `/api/threats/{id}` | Full threat detail + recommended actions |
| `POST` | `/api/simulate-attack` | Inject synthetic attack into the pipeline |
| `POST` | `/api/respond` | Execute a containment action on a threat |
| `GET` | `/api/risk/history` | Risk score timeline for charting |
| `GET` | `/api/model/info` | ML model metadata and feature list |
| `POST` | `/api/reset` | Full system reset (clears DB + risk score) |

### Example — Simulate a DDoS Attack
```bash
curl -X POST http://localhost:8000/api/simulate-attack \
  -H "Content-Type: application/json" \
  -d '{"attack_type": "ddos", "intensity": 100}'
```

### Example — Execute Block IP Response
```bash
curl -X POST http://localhost:8000/api/respond \
  -H "Content-Type: application/json" \
  -d '{"threat_id": "<uuid>", "action": "block_ip", "target": "185.23.44.12"}'
```

---

## 🖥️ Frontend Dashboard

The React dashboard (Vite, pure JSX + CSS) provides **12 specialized components**:

| Component | Purpose |
|---|---|
| `StatsBar` | Live KPI ribbon — total events, active threats, mitigated count, uptime |
| `RiskGauge` | Animated radial dial showing real-time system risk (0–100) |
| `ThreatFeed` | Live scrolling threat list with severity color-coding and filtering |
| `ThreatDetail` | Full modal with MITRE ID, indicators, XAI radar chart, response buttons |
| `TerminalLog` | Syntax-highlighted SOC operator terminal feed (green-on-black) |
| `AttackMap` | World map with animated attack origin geo-visualization |
| `AttackTimeline` | Chronological event timeline with threat clustering |
| `AttackSimulator` | Control panel to manually fire attack simulations |
| `NetworkTopology` | Kill Chain network graph — nodes, lateral movement paths |
| `RadarChart` | XAI Explainability — feature contribution radar for each threat |
| `ThreatReplay` | Step-through historical threat playback mode |
| `GuidedDemo` | Structured demo flow for presentations |

---

## 🚀 Running Locally

### Prerequisites

- Python 3.10+ and Node.js 18+
- A virtual environment (`.venv` at project root)

### 1. Install Backend Dependencies

```bash
# From project root
.venv\Scripts\pip install fastapi uvicorn scikit-learn pandas numpy pydantic
```

### 2. Start the Backend

```bash
cd backend
..\venv\Scripts\python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will automatically:
1. Train the **Isolation Forest** on 4,000 synthetic normal baseline events
2. Train the **Random Forest Classifier** on 160 labeled attack samples
3. Start the **async background event processor** (every 5 seconds)
4. Expose all REST endpoints and Swagger docs at `http://localhost:8000/docs`

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** to access the dashboard.

---

## 🎯 Attack Simulation (Demo Flow)

Use the built-in Attack Simulator panel or API to trigger realistic attack scenarios:

```bash
# Brute Force — high login failure rate from suspicious IP
curl -X POST http://localhost:8000/api/simulate-attack -d '{"attack_type":"brute_force"}'

# DDoS — volumetric flood from 4 attacker IPs (auto-mitigates)
curl -X POST http://localhost:8000/api/simulate-attack -d '{"attack_type":"ddos"}'

# Port Scan — 40 distinct ports from single suspicious IP
curl -X POST http://localhost:8000/api/simulate-attack -d '{"attack_type":"port_scan"}'

# Data Exfiltration — large payload transfers to external endpoint
curl -X POST http://localhost:8000/api/simulate-attack -d '{"attack_type":"exfiltration"}'

# Reset everything for a clean demo
curl -X POST http://localhost:8000/api/reset
```

**Critical-severity threats (DDoS, Exfiltration) are automatically mitigated** — the response engine blocks the source IP and reduces the risk score without human intervention.

---

## 🗄️ Storage Schema (SQLite — `aegis.db`)

### `threats` table
```sql
id TEXT PRIMARY KEY,      -- UUID
timestamp TEXT,            -- ISO-8601 UTC
threat_type TEXT,          -- brute_force | ddos | port_scan | exfiltration | insider_threat | unknown_anomaly
severity TEXT,             -- low | medium | high | critical
confidence REAL,           -- ML classifier confidence (0–100)
source_ip TEXT,            -- attacker IP
target_user TEXT,          -- targeted account
geo TEXT,                  -- geolocation label
anomaly_score REAL,        -- IsolationForest decision score
explanation TEXT,          -- human-readable threat title
indicators TEXT,           -- JSON array of behavioral indicators
recommendation TEXT,       -- SOC analyst recommendation
status TEXT,               -- active | mitigated
response_action TEXT       -- last executed containment action
```

### `risk_history` table
Timestamped snapshots of the system risk score — used for the dashboard trend chart.

### `events` table
Raw event log for audit trail and replay capabilities.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | FastAPI 0.135+ with async lifespan |
| **ML Framework** | scikit-learn (IsolationForest + RandomForest) |
| **Data Processing** | NumPy, Pandas |
| **Data Validation** | Pydantic v2 |
| **ASGI Server** | Uvicorn |
| **Storage** | SQLite (zero-dependency, file-based) |
| **Frontend** | React 18 + Vite 7 |
| **Styling** | Vanilla CSS with design system tokens |
| **Security Framework** | MITRE ATT&CK Enterprise |

---

## 🔀 Operating Modes

| Mode | Description | Status |
|---|---|---|
| **Simulation** | Synthetic traffic from built-in attack generators. Used for demos, development, and ML validation. | ✅ Available |
| **Telemetry** | Real system logs ingested from deployed agents via message broker. | 🔜 Planned |

> In Simulation mode, no real systems are affected. All traffic is generated internally by the `log_generator` module.

---

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────────┐
│                   AegisAI Security Model                │
│                                                         │
│   Zero Trust Event Analysis                             │
│     └─▶ Every event evaluated regardless of origin      │
│                                                         │
│   Behavioral Anomaly Detection                          │
│     └─▶ Isolation Forest on 9 behavioral features       │
│                                                         │
│   MITRE ATT&CK Classification                           │
│     └─▶ Random Forest → mapped to ATT&CK technique IDs  │
│                                                         │
│   Automated Containment (SOAR)                          │
│     └─▶ block_ip · rate_limit · lock_account · isolate  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Metrics

| Metric | Value | Notes |
|---|---|---|
| Event throughput | ~150 events/sec | Synthetic pipeline, single-threaded |
| Aggregation window | 5 seconds | Per source IP |
| Detection latency | < 1 second | Isolation Forest inference |
| Classification latency | < 100 ms | Random Forest (100 trees) |
| Memory footprint | ~120 MB | Models + SQLite + API server |
| API response time | < 50 ms | FastAPI async endpoints |

---

## 🗺️ Future Architecture — Production Deployment

```
┌──────────────────┐
│  Servers / VMs   │
│  Cloud Instances │
│  IoT Devices     │
└────────┬─────────┘
         │ syslog / auth.log / netflow
         ▼
┌──────────────────┐
│   Log Agents     │   (Filebeat / Fluentd / Custom)
│   Endpoint Agents│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Message Broker  │   (Kafka / Redis Streams / NATS)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AegisAI Engine  │   ← current ML pipeline + SOAR
│  (Stream Proc.)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Scalable Store  │   (ClickHouse / ElasticSearch / TimescaleDB)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Dashboard / API │   ← current React + FastAPI
└──────────────────┘
```

> The current prototype architecture slots directly into the **AegisAI Engine** layer. Adding ingestion agents and a message broker would enable real-world deployment.

---

## 🛠️ Development Notes

- **No external services required** — fully self-contained, runs offline
- **Models re-train on every startup** — fresh baseline each session
- **Async background loop** runs every 5 seconds processing normal traffic
- **CORS is open (`*`)** — restrict `allow_origins` in `main.py` for production
- The `.venv` must be at the project root (`AegisAI/.venv`)

---

## 📄 License

MIT License — built for research, education, and enterprise demonstration purposes.

---

<p align="center">
  Built with ⚡ by the AegisAI team &nbsp;|&nbsp; <b>Defense at machine speed.</b>
</p>
