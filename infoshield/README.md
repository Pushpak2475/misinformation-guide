<div align="center">

# 🛡️ InfoShield AI
### Real-Time Misinformation Containment System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**A production-grade, browser-native AI platform that detects, verifies, and counters misinformation in real-time — powered by multi-source aggregation and an in-browser heuristic classifier.**

[Live Demo](#) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔴 **Live RSS Feeds** | 10+ mainstream sources: BBC, Reuters, AP, CNN, NPR, Al Jazeera, Politico… |
| ⚠️ **Fake News Detection** | Heuristic classifier with 80+ domain credibility scores, keyword analysis, sensationalism detection |
| 📡 **Multi-Platform Social** | Reddit (news + conspiracy subs), HackerNews, Mastodon, YouTube trending |
| 🌐 **Google Trends** | Real-time trending topics (4-strategy fetch with HackerNews fallback) |
| 🔔 **Live Notifications** | Real-time alert dropdown — FAKE articles sorted and highlighted first |
| ⚡ **Live Stream** | Animated real-time feed with FAKE items pinned at top with red highlighting |
| 🔐 **Auth System** | Login / Signup with localStorage session persistence |
| 📊 **Dashboard** | Detection rate charts, source credibility, category breakdown, agent pipeline |
| ✅ **Check Any News** | Paste any article/URL for instant multi-signal AI analysis |
| 🔎 **Fact-Check Links** | Auto-generated links to Snopes, PolitiFact, FactCheck.org, AFP, Full Fact for every verdict |

---

## 🏗️ Architecture

```
infoshield/
├── src/
│   ├── pages/
│   │   ├── Landing.tsx        # Home page
│   │   ├── Dashboard.tsx      # Mission control dashboard
│   │   ├── CheckNews.tsx      # News verification tool
│   │   ├── RSSFeeds.tsx       # Live RSS feed browser
│   │   ├── ActiveAlerts.tsx   # Severity-sorted alert centre
│   │   ├── LiveStream.tsx     # Real-time streaming feed
│   │   ├── Admin.tsx          # Admin panel
│   │   └── Auth.tsx           # Login + Signup
│   ├── services/
│   │   ├── newsService.ts     # Multi-platform data fetching
│   │   └── classifierService.ts # In-browser fake news classifier
│   ├── components/
│   │   ├── layout/            # Sidebar, Navbar, NotificationPanel
│   │   ├── ui/                # GlassCard, Badges, Particles
│   │   ├── charts/            # RadialChart, custom chart components
│   │   └── agents/            # AgentFlowDiagram
│   └── data/
│       └── mockData.ts        # Fallback data
└── public/
```

---

## 🧠 How the Classifier Works

The classifier is **entirely browser-native** — no server, no API key.

### Scoring Signals

| Signal | Effect | Weight |
|---|---|---|
| Domain credibility ≥ 90% | → **REAL** baseline | +55 pts |
| Domain credibility 75–89% | → REAL lean | +35 pts |
| Domain credibility < 40% | → **FAKE** baseline | +50 pts |
| Misinformation keywords | → FAKE | +18 pts each |
| Emotional manipulation | → FAKE | +12 pts each |
| Sensationalism patterns | → FAKE | +7 pts each |
| Journalistic attribution | → REAL | +12 pts each |
| Professional tone | → REAL | +5 pts |

### Verdict Thresholds
- **REAL**: `realScore > fakeScore × 1.2`
- **FAKE**: `fakeScore > realScore × 1.2`
- **UNCERTAIN**: Genuinely close scores or truly unanalyzable input

### Domain Credibility Database
80+ domains rated including:
- **Tier S (95–98):** Reuters, AP, BBC, WHO, CDC, NASA
- **Tier A (88–94):** NYT, Guardian, Bloomberg, Snopes, FactCheck.org
- **Tier D (25–39):** RT, Sputnik, PressTV
- **Tier E (4–22):** Infowars, NaturalNews, Breitbart, The Onion (satire)

---

## 📡 Data Sources

### Mainstream News RSS
- BBC World News, Reuters, AP News, CNN, NPR, Al Jazeera, Sky News, Google News, The Hill, Politico

### Misinformation-Prone Sources (flagged)
- RT (Russia Today), Daily Mail, NY Post, Zero Hedge

### Fact-Checking Sites
- Snopes, PolitiFact, FactCheck.org, AFP Fact Check

### Social Platforms
- **Reddit:** r/worldnews, r/news, r/politics, r/science, r/technology, r/conspiracy, r/conspiracytheories
- **HackerNews:** Top stories (public Firebase API)
- **Mastodon:** Public federated timeline
- **YouTube:** Trending RSS feed

### Trends
- Google Trends RSS (US, UK, IN) with HackerNews fallback

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/infoshield-ai.git
cd infoshield-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🔐 Demo Login

| Email | Password | Role |
|---|---|---|
| `admin@infoshield.ai` | `admin123` | Admin |

Or create your own account via the **Sign Up** page.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 8 |
| **Styling** | Tailwind CSS + custom CSS (glassmorphism) |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Router** | React Router v7 |
| **Icons** | Lucide React |
| **Auth** | localStorage sessions (no backend) |
| **Data** | Browser fetch + rss2json proxy + Reddit JSON API + HN Firebase API |

---

## 📸 Screenshots

> Dashboard with live RSS, detection charts, Reddit, and HackerNews feeds.

> Live Stream panel with FAKE articles pinned at top with red highlighting.

> Active Alerts sorted by severity: CRITICAL → HIGH → MEDIUM → LOW.

> Check News — multi-signal AI pipeline with agent flow visualization.

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

**InfoShield AI** — Agentic AI for Misinformation Containment

> Built with ❤️ using React, TypeScript, and Vite.

</div>
