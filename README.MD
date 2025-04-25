# 💡 Gem AI Assistant

A next-gen productivity app that employs AI to assist in daily tasks such as sending mails, scheduling meetings, summarizing content, and more — in real-time.

---

## 📦 Dockerized Setup

This image contains:

- ✅ Qt-based GUI frontend
- ✅ Node.js backend (triggered by UI)
- ✅ Redis (for caching OCR and more)
- ✅ Screenpipe (bundled via script)
- ✅ Shared `config/` folder

---

## 🚀 Getting Started

### 🔧 Build the Image

```bash
docker build -t gem-agent .