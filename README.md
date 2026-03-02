<div align="center">

# 💹 Wealth Tracker

**A privacy-first net worth tracker built for India.**

Track Gold, Mutual Funds, EPF, Real Estate, and more in Lakhs & Crores.  
Sync across devices with a simple key. No account needed.

[🔗 **Live Demo**](https://jayaraju-gorle.github.io/wealth-tracker/)

</div>

---

## ✨ Features

- **📊 Dashboard** — At-a-glance summary of total assets, liabilities, and net worth with month-over-month change tracking
- **💰 Portfolio Manager** — Track assets (Cash, MFs, Stocks, Gold, FDs, EPF, Real Estate, Crypto) and liabilities (Home Loan, Car Loan, Credit Cards)
- **📈 Wealth Projections** — 5-year future projection based on your asset growth rates and monthly SIP contributions
- **🎯 Financial Milestones** — Set goals with visual progress rings and celebrate when you hit them
- **⏳ Time Machine** — Log historical net worth snapshots and see your trend over time with sparkline charts
- **☁️ Cloud Sync** — Share data across devices using a simple sync key (powered by Firebase)
- **🔒 Privacy First** — All data stays on your device by default; cloud sync is opt-in
- **📱 Mobile Ready** — Responsive design with bottom tab navigation for mobile

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript |
| **Styling** | TailwindCSS (CDN), Glassmorphic dark UI |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Backend** | Firebase Realtime Database, Anonymous Auth |
| **Build** | Vite |
| **Deploy** | GitHub Pages (via GitHub Actions) |

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173/wealth-tracker/](http://localhost:5173/wealth-tracker/)

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Preview the build
npm run preview
```

Deployment is automated: push to `main` → GitHub Actions builds and deploys to GitHub Pages.

## 📄 License

MIT
