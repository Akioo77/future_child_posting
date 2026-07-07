"""测试 AI 响应解析的容错性。

这是 FCP 项目最关键的功能——AI 返回的 JSON 格式经常不规整：
- 有时被 markdown ``` 包裹
- 有时夹杂解释文字
- 有时 JSON 不完整（截断）
- 有时 key 缺失

我们必须能优雅处理各种情况。
"""
import pytest
from backend.services.ai_service import _parse_ai_response


class TestParseNormalJSON:
    """正常情况"""

    def test_pure_json(self):
        raw = '{"risks": [], "suggestions": [], "text_suggestions": []}'
        result = _parse_ai_response(raw)
        assert result["risks"] == []
        assert result["suggestions"] == []
        assert result["text_suggestions"] == []

    def test_full_response(self):
        raw = '''{
            "risks": [
                {"id": "R4", "type": "位置暴露风险", "level": "H",
                 "description": "学校名称暴露", "source": "text",
                 "image_index": null, "bbox": null}
            ],
            "suggestions": [{"text": "删除学校名称"}],
            "text_suggestions": [
                {"original": "在XX小学报名", "revised": "在心仪的小学报名", "reason": "去除具体校名"}
            ]
        }'''
        result = _parse_ai_response(raw)
        assert len(result["risks"]) == 1
        assert result["risks"][0].id == "R4"
        assert result["risks"][0].level == "H"
        assert len(result["suggestions"]) == 1
        assert len(result["text_suggestions"]) == 1


class TestParseMarkdownWrapped:
    """markdown 包装（最常见问题）"""

    def test_simple_markdown_wrap(self):
        raw = '''```json
{"risks": [], "suggestions": [], "text_suggestions": []}
```'''
        result = _parse_ai_response(raw)
        assert result["risks"] == []

    def test_markdown_without_json_tag(self):
        raw = '''```
{"risks": [], "suggestions": [], "text_suggestions": []}
```'''
        result = _parse_ai_response(raw)
        assert result["risks"] == []

    def test_markdown_with_surrounding_text(self):
        raw = '''这是分析结果：
```json
{"risks": [{"id": "R1", "type": "x", "level": "M", "description": "y", "source": "text", "image_index": null, "bbox": null}], "suggestions": [], "text_suggestions": []}
```
希望对你有帮助！'''
        result = _parse_ai_response(raw)
        # 应该从第一个 { 开始截取
        assert len(result["risks"]) == 1
        assert result["risks"][0].id == "R1"


class TestParseMissingFields:
    """字段缺失（AI 经常省略可选字段）"""

    def test_missing_image_index_and_bbox(self):
        raw = '{"risks": [{"id": "R1", "type": "x", "level": "M", "description": "y", "source": "text"}], "suggestions": [], "text_suggestions": []}'
        result = _parse_ai_response(raw)
        assert result["risks"][0].image_index is None
        assert result["risks"][0].bbox is None

    def test_missing_text_suggestions(self):
        raw = '{"risks": [], "suggestions": []}'
        result = _parse_ai_response(raw)
        assert result["text_suggestions"] == []

    def test_missing_suggestions(self):
        raw = '{"risks": []}'
        result = _parse_ai_response(raw)
        assert result["suggestions"] == []


class TestParseExtremeCases:
    """极端情况"""

    def test_extra_text_before_json(self):
        # AI 在 JSON 前面写了"好的，分析如下："之类的话
        raw = '好的，我来帮您分析。这是结果：{"risks": [], "suggestions": [], "text_suggestions": []}'
        result = _parse_ai_response(raw)
        assert result["risks"] == []

    def test_trailing_text_after_json(self):
        raw = '{"risks": [], "suggestions": [], "text_suggestions": []}如果有问题请告诉我。'
        # 这种情况下 json.loads 会失败，回退到 find { } 提取
        result = _parse_ai_response(raw)
        assert result["risks"] == []

    def test_empty_string(self):
        with pytest.raises(ValueError, match="无法解析"):
            _parse_ai_response("")

    def test_pure_garbage(self):
        with pytest.raises(ValueError, match="无法解析"):
            _parse_ai_response("这是一段没有任何 JSON 的文字")

    def test_invalid_json_structure(self):
        # 字符串而不是对象 — 当前代码会因 parsed.get 失败抛 AttributeError
        # 这是已知问题，TODO: 应该在解析阶段就验证顶层是 dict
        with pytest.raises((ValueError, AttributeError)):
            _parse_ai_response('"this is a string"')


class TestParseWithWhitespace:
    """空白处理"""

    def test_leading_whitespace(self):
        raw = '   \n  {"risks": [], "suggestions": [], "text_suggestions": []}'
        result = _parse_ai_response(raw)
        assert result["risks"] == []

    def test_markdown_with_indentation(self):
        raw = '''```json
    {
        "risks": [],
        "suggestions": [],
        "text_suggestions": []
    }
    ```'''
        result = _parse_ai_response(raw)
        assert result["risks"] == []