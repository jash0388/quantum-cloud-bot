# ⚡ TGX Quantum 24/7 Cloud Bot System

A high-performance, cloud-deployable automated bot system that runs 24/7 independently of your local computer, with a responsive mobile & desktop web control dashboard.

---

## 🚀 Quick Start (Run Locally or on Cloud)

### 1. Install & Run:
```bash
cd /Users/jashwanthsingh/quantum-wingo-bot/cloud
npm install
npm start
```
Then open: **`http://localhost:3000`** on your browser or phone!

---

## ☁️ 24/7 Cloud Deployment (AWS / DigitalOcean / VPS)

### Option A: Using Docker (1 Command)
```bash
docker-compose up -d --build
```

### Option B: Using PM2 (Production Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name "quantum-cloud-bot"
pm2 startup
pm2 save
```

---

## 📱 Mobile Control Dashboard Features
* **Live Balance & P/L Tracking:** Updates instantly on every round draw.
* **Remote START / STOP:** Control the cloud bot from anywhere via phone or laptop.
* **Risk Guards:** Set Base Bet (₹4), Max Martingale Level Cap, Take-Profit targets, and Stop-Loss thresholds.
* **Zero Laptop Dependency:** Cloud bot runs non-stop even when your laptop is turned off, asleep, or offline.
