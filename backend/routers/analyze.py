"""
/api/analyze 路由 — 接收多张图片+文字，返回风险分析报告
"""

import base64
from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
)
from backend.services.ai_service import analyze_content

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

    # 3. 调用 AI 分析
    try:
        result = await analyze_content(request.images, request.text)
        return AnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 分析失败: {e}")