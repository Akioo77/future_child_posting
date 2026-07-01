"""
Future Child Posting — FastAPI 后端入口
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import analyze

app = FastAPI(
    title="Future Child Posting API",
    version="0.1.0",
    description="AI 辅助家长识别社交媒体分享儿童内容的隐私风险",
)

# CORS：允许前端开发服务器访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境，生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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