"""
Future Child Posting — FastAPI 后端入口
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import analyze

app = FastAPI(
    title="Future Child Posting API",
    version="0.1.0",
    description="AI 辅助家长识别社交媒体分享儿童内容的隐私风险",
)

# CORS 配置：优先用环境变量 CORS_ALLOWED_ORIGINS（逗号分隔），
# 回退到开发环境配置（localhost + 127.0.0.1 多端口）
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
_allowed_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
if _allowed_origins_env:
    _allowed_origins = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
else:
    _allowed_origins = _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# 路由
app.include_router(analyze.router, prefix="/api", tags=["analyze"])


@app.get("/")
async def root():
    return {
        "message": "Future Child Posting API",
        "status": "running",
        "version": "0.1.0",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)