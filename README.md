# Artisan Assistant

AI-powered marketplace assistant for local artisans.  
This project uses a **Docker Compose** setup with three main services:

- **backend** — Node.js + Express + MongoDB (API)
- **frontend** — React + Vite (UI)
- **ml** — Python environment for ML models (PyTorch etc.)

---
 
 
## 🚀 Development Setup
 
### 1. Clone the repository
 
git clone git@github.com:thisisdev24/artisan-assistant.git
cd artisan-assistant
 
 
⚙️ Build Services
 
Build all services defined in docker-compose.yml:
docker compose build
 
Or build a specific service (e.g. ML):
docker compose build ml
 
 
▶️ Run the Stack
 
Start everything in the background:
docker compose up -d
 
Start in the foreground (shows logs):
docker compose up
 
Stop all running containers:
docker compose down
 
 
🧪 Running Tests
 
Backend tests (if available):
docker compose exec backend npm test
 
ML service tests (example):
docker compose exec ml pytest

 
📂 Project Structure
 
artisan-assistant/
 
│
 
├── backend/          # Node.js Express server
 
├── frontend/         # React Vite frontend
 
├── ml/               # Python ML code + Dockerfile + requirements.txt
 
├── docker-compose.yml
 
└── README.md
