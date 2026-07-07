"""
/api/analyze 路由 — 接收多张图片+文字，返回风险分析报告
"""

import base64
import httpx
import json
import logging
from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
)
from backend.services.ai_service import analyze_content

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_IMAGES = 9
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB per image


def validate_image(b64_str: str) -> None:
    """验证单张 Base64 图片大小，不超过 10MB"""
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    try:
        decoded = base64.b64decode(b64_str)
        size = len(decoded)
        if size > MAX_IMAGE_SIZE:
            raise ValueError(f"单张图片大小 {size / 1024 / 1024:.1f}MB 超过 10MB 限制")
    except Exception as e:
        raise ValueError(f"图片 Base64 解码失败: {e}")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """分析多张图片和文字中的儿童隐私风险"""

    # 1. 校验数量
    if len(request.images) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"最多上传 {MAX_IMAGES} 张图片")

    if len(request.images) == 0:
        raise HTTPException(status_code=400, detail="请至少上传一张图片")

    # 2. 校验每张图片大小
    for i, img in enumerate(request.images):
        try:
            validate_image(img)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"第 {i+1} 张图片: {e}")

    # 3. 调用 AI 分析，区分错误类型给前端更明确的反馈
    try:
        result = await analyze_content(request.images, request.text)
        logger.info(
            "[ANALYZE] risks=%d, suggestions=%d, text_suggestions=%d",
            len(result["risks"]), len(result["suggestions"]), len(result["text_suggestions"]),
        )
        return AnalyzeResponse(**result)
    except httpx.TimeoutException as e:
        logger.error("[ANALYZE] AI API 超时: %s", e)
        raise HTTPException(status_code=504, detail=f"AI 服务响应超时，请稍后重试: {e}")
    except httpx.HTTPStatusError as e:
        logger.error("[ANALYZE] AI API HTTP %d: %s", e.response.status_code, e.response.text[:200])
        raise HTTPException(
            status_code=502,
            detail=f"AI 服务返回错误 ({e.response.status_code}): {e.response.text[:200]}",
        )
    except ValueError as e:
        # JSON 解析失败等
        logger.error("[ANALYZE] 解析失败: %s", e)
        raise HTTPException(status_code=502, detail=f"AI 返回内容无法解析: {e}")
    except Exception as e:
        logger.exception("[ANALYZE] 未预期错误")
        raise HTTPException(status_code=500, detail=f"AI 分析失败: {e}")