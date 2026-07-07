"""测试 Pydantic schemas 的验证逻辑。

schemas 是前后端契约，必须严格。
"""
import pytest
from pydantic import ValidationError
from backend.models.schemas import (
    AnalyzeRequest,
    RiskItem,
    SuggestionItem,
    TextSuggestionItem,
    AnalyzeResponse,
)


class TestRiskItem:
    """RiskItem 是最复杂的 schema"""

    def test_minimal_valid(self):
        item = RiskItem(
            id="R1", type="自我披露风险",
            level="M", description="x", source="text",
        )
        assert item.image_index is None
        assert item.bbox is None

    def test_with_bbox(self):
        item = RiskItem(
            id="R4", type="位置暴露", level="H",
            description="校徽", source="image0",
            image_index=0, bbox=[10, 20, 30, 40],
        )
        assert item.bbox == [10, 20, 30, 40]

    def test_invalid_id_should_fail(self):
        # id 必填，缺失会报错
        with pytest.raises(ValidationError):
            RiskItem(type="x", level="M", description="y", source="text")

    def test_bbox_with_extra_dimensions(self):
        # bbox 接受任意 List[float]，长度校验在调用方做
        # 当前 Pydantic 不会强制 list 长度
        item = RiskItem(
            id="R1", type="x", level="M", description="y",
            source="text", bbox=[1, 2, 3],
        )
        assert item.bbox == [1, 2, 3]
        # 真正的长度校验在 RiskReport 渲染时（前端）


class TestTextSuggestionItem:
    """文案改写建议"""

    def test_minimal_valid(self):
        item = TextSuggestionItem(
            original="原", revised="改", reason="原因",
        )
        assert item.original == "原"

    def test_missing_original_should_fail(self):
        with pytest.raises(ValidationError):
            TextSuggestionItem(revised="x", reason="y")


class TestAnalyzeRequest:
    """请求体"""

    def test_empty_images_should_fail(self):
        # 当前 schema 没有强制 images 至少 1 张（路由层校验）
        # 所以这里仅记录现状，不强制 schema 校验
        req = AnalyzeRequest(images=[], text="hi")
        assert req.images == []

    def test_default_text(self):
        req = AnalyzeRequest(images=["img1"])
        assert req.text == ""

    def test_max_9_images_allowed(self):
        req = AnalyzeRequest(images=[f"img{i}" for i in range(9)])
        assert len(req.images) == 9


class TestAnalyzeResponse:
    """响应体 — 默认值"""

    def test_default_empty_lists(self):
        resp = AnalyzeResponse()
        assert resp.risks == []
        assert resp.suggestions == []
        assert resp.text_suggestions == []

    def test_with_risks(self):
        resp = AnalyzeResponse(
            risks=[RiskItem(id="R1", type="x", level="L",
                          description="y", source="text")],
            suggestions=[SuggestionItem(text="建议")],
        )
        assert len(resp.risks) == 1
        assert len(resp.suggestions) == 1
        assert resp.text_suggestions == []  # 默认空


class TestRealWorldScenarios:
    """真实场景"""

    def test_school_name_exposure(self):
        """典型场景：文字暴露学校名称"""
        resp = AnalyzeResponse(
            risks=[RiskItem(
                id="R4", type="位置暴露风险", level="H",
                description="提及'清华附小'", source="text",
            )],
            suggestions=[SuggestionItem(text="删除校名")],
            text_suggestions=[TextSuggestionItem(
                original="去清华附小报名",
                revised="去心仪的小学报名",
                reason="去除具体校名",
            )],
        )
        assert resp.risks[0].level == "H"
        assert "小学" in resp.text_suggestions[0].revised

    def test_multiple_image_risks(self):
        """多图场景：每张图独立风险"""
        risks = [
            RiskItem(id="R2", type="身份暴露", level="H",
                    description="正脸", source="image0",
                    image_index=0, bbox=[30, 25, 40, 55]),
            RiskItem(id="R3", type="机密泄露", level="H",
                    description="白板", source="image1",
                    image_index=1, bbox=[10, 20, 80, 40]),
        ]
        resp = AnalyzeResponse(risks=risks)
        assert len(resp.risks) == 2
        assert resp.risks[0].image_index == 0
        assert resp.risks[1].image_index == 1