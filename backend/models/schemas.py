from pydantic import BaseModel, Field
from typing import List, Optional


class AnalyzeRequest(BaseModel):
    """请求体：多张图片（Base64 列表）+ 可选文字"""
    images: List[str] = Field(
        ...,
        description="Base64 编码的图片列表，最多 9 张，可选带 data URI 前缀"
    )
    text: str = Field(default="", description="用户想发布的文字说明")


class RiskItem(BaseModel):
    """检测到的单个风险"""
    id: str = Field(..., description="风险编号 R1-R5")
    type: str = Field(..., description="风险类型（中文）")
    level: str = Field(..., description="风险等级：H(高)/M(中)/L(低)")
    description: str = Field(..., description="具体描述")
    source: str = Field(..., description="来源：image0-8 / text / both")
    image_index: Optional[int] = Field(
        default=None,
        description="风险来自哪张图片（0-based），纯文字风险时为 null"
    )
    bbox: Optional[List[float]] = Field(
        default=None,
        description="风险区域坐标 [x_percent, y_percent, width_percent, height_percent]，0-100，仅图片风险有"
    )


class SuggestionItem(BaseModel):
    """针对某个风险的修改建议"""
    text: str = Field(..., description="建议内容")


class AnalyzeResponse(BaseModel):
    """分析响应"""
    risks: List[RiskItem] = Field(default_factory=list, description="检测到的风险列表")
    suggestions: List[SuggestionItem] = Field(default_factory=list, description="修改建议列表")


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str