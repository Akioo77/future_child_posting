"""
Future Child Posting — FastAPI 后端入口
"""

import logging
import os
import time
import uuid
from contextvars import ContextVar
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.routers import analyze

# ── 日志配置 ───────────────────────────────────────
# INFO 级别，输出到 stdout（便于 docker/k8s 收集）
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(request_id)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fcp")

# ── 请求上下文（每个请求独立 UUID） ─────────────────────────
_request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
_request_start_var: ContextVar[float] = ContextVar("request_start", default=0.0)


class RequestContextFilter(logging.Filter):
    """为每条日志附加当前请求的 request_id"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(record, "request_id", None) or _request_id_var.get() or "-"
        return True


# 给所有 logger 的 handler 加 filter
for name in logging.root.manager.loggerDict:
    lg = logging.getLogger(name)
    if isinstance(lg, logging.Logger):
        for h in lg.handlers:
            h.addFilter(RequestContextFilter())
# 同时给 root 的 handler 加（兜底）
for handler in logging.getLogger().handlers:
    handler.addFilter(RequestContextFilter())

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


# ── 请求日志中间件（每个请求生成 UUID + 记录耗时） ─────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request_id_token = _request_id_var.set(request_id)
    start_token = _request_start_var.set(time.time())
    logger.info("→ %s %s", request.method, request.url.path)

    try:
        response = await call_next(request)
    except Exception as e:
        elapsed_ms = (time.time() - _request_start_var.get()) * 1000
        logger.exception("✗ %s %s [%.0fms] %s", request.method, request.url.path, elapsed_ms, e)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
        )

    elapsed_ms = (time.time() - _request_start_var.get()) * 1000
    # 健康检查请求降级为 DEBUG，避免刷屏
    log_level = logging.DEBUG if request.url.path == "/health" else logging.INFO
    logger.log(
        log_level,
        "← %s %s [%d, %.0fms]",
        request.method, request.url.path, response.status_code, elapsed_ms,
    )
    response.headers["X-Request-ID"] = request_id
    _request_id_var.reset(request_id_token)
    _request_start_var.reset(start_token)
    return response


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