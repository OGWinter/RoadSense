# RoadSense 🛣️

> AI-powered road condition monitoring platform for smart cities

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | MongoDB Atlas |
| **Storage** | Cloudinary (video uploads) |
| **AI/ML** | Road defect detection pipeline |
| **Auth** | JWT + Email Verification + Forgot Password |

## 📦 Project Structure

```
RoadSense/
├── Client/          # React frontend (Vite)
└── Server/          # Express backend (TypeScript)
```

## ⚙️ Setup

### Backend
```bash
cd Server
npm install
cp .env.example .env   # Fill in your credentials
npm run dev
```

### Frontend
```bash
cd Client
npm install
npm run dev
```

## 🔑 Environment Variables

See `Server/.env.example` for all required variables:
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — JWT signing secret
- `CLOUDINARY_*` — Cloudinary credentials for video storage
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — Gmail for email verification & forgot password
- `CLIENT_URL` — Frontend URL (default: http://localhost:5173)

## ✨ Features

- 📹 **Video Upload** — Road survey videos uploaded to Cloudinary
- 🗺️ **GPS Mapping** — Interactive Leaflet map with road defect markers
- 🤖 **AI Detection** — Automated pothole/crack detection pipeline
- 👤 **Role-Based Access** — Admin, Municipal Officer, Volunteer
- 📧 **Email Auth** — Verification email on signup + Forgot password flow
- 📊 **Dashboard** — Real-time stats, reports, and issue tracking
- 🗑️ **Admin Controls** — Delete videos (removes from Cloudinary + DB)
