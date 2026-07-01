# Future Child Posting

> AI 辅助家长识别社交媒体分享孩子内容时的隐私风险

---

## 🎯 项目概述

- **类型**：学术研究项目（HCI / CHI 方向）
- **RQ**：AI 辅助的「发布前风险扫描」能否有效帮助父母识别和规避分享孩子内容时的隐私和伦理风险？
- **产出**：MVP 原型 + 用户研究 → 论文

---

## 🏗️ 系统架构

```
前端 (Next.js :3000)  ←→  后端 (FastAPI :8000)  ←→  Minimax VL API
```

---

## 📁 项目结构

```
future_child_posting/
├── SPEC.md                    ← 项目规格说明
├── README.md                  ← 本文件
│
├── backend/                   # FastAPI 后端
│   ├── main.py                # 入口
│   ├── requirements.txt
│   ├── routers/analyze.py     # /api/analyze 路由
│   ├── services/ai_service.py # AI 调用逻辑
│   └── models/schemas.py      # Pydantic 模型
│
└── frontend/                  # Next.js 前端
    ├── package.json
    ├── src/
    │   ├── app/page.tsx       # 首页
    │   └── components/
    │       ├── UploadPanel.tsx
    │       ├── TextInput.tsx
    │       └── RiskReport.tsx
```

---

## 🚀 启动方式

### 1. 后端

```bash
cd backend
pip install -r requirements.txt
# 配置 MINIMAX_API_KEY（在 ai_service.py 中替换）
uvicorn main:app --reload --port 8000
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

前端访问：http://localhost:3000
后端 API：http://localhost:8000

---

## 🔑 注意事项

- Minimax API Key 需要在 `backend/services/ai_service.py` 中替换
- 通过代理 `http://127.0.0.1:7897` 访问（需开启 Clash Verge）
- 图片最大 10MB

---

_创建时间：2026-07-01_