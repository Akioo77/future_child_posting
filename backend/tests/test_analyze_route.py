"""测试 /api/analyze 路由逻辑。

重点测试：
- 请求参数验证
- 错误分类（400/500/502/504）
- 不实际调用 AI（用 mock）
"""
import base64
import pytest
from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """FastAPI 测试客户端"""
    # 必须在导入 main 之前设置环境变量，否则 main.py 启动会报错
    import os
    os.environ.setdefault("DASHSCOPE_API_KEY", "test-key")
    from backend.main import app
    return TestClient(app)


def make_valid_b64(size_bytes=100) -> str:
    """生成有效 base64（用于通过大小校验）"""
    return base64.b64encode(b"x" * size_bytes).decode()


class TestRequestValidation:
    """请求参数校验"""

    def test_empty_images_returns_400(self, client):
        resp = client.post("/api/analyze", json={"images": [], "text": "hi"})
        assert resp.status_code == 400
        assert "至少上传一张图片" in resp.json()["detail"]

    def test_too_many_images_returns_400(self, client):
        resp = client.post(
            "/api/analyze",
            json={"images": [make_valid_b64() for _ in range(10)], "text": ""},
        )
        assert resp.status_code == 400
        assert "最多上传 9 张图片" in resp.json()["detail"]

    def test_image_too_large_returns_400(self, client):
        # 11MB 的图
        big_b64 = base64.b64encode(b"x" * (11 * 1024 * 1024)).decode()
        resp = client.post(
            "/api/analyze",
            json={"images": [big_b64], "text": ""},
        )
        assert resp.status_code == 400
        assert "超过 10MB" in resp.json()["detail"]

    def test_invalid_base64_returns_400(self, client):
        resp = client.post(
            "/api/analyze",
            json={"images": ["not-valid-base64!!!@@@"], "text": ""},
        )
        assert resp.status_code == 400


class TestHealthEndpoint:
    """健康检查"""

    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_root_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "running"


class TestErrorClassification:
    """错误分类 — 用 mock 模拟 AI 服务异常"""

    def test_timeout_returns_504(self, client):
        with patch("backend.routers.analyze.analyze_content",
                   new=AsyncMock(side_effect=httpx.TimeoutException("timeout"))):
            resp = client.post(
                "/api/analyze",
                json={"images": [make_valid_b64()], "text": "hi"},
            )
            assert resp.status_code == 504
            assert "超时" in resp.json()["detail"]

    def test_http_status_error_returns_502(self, client):
        mock_response = AsyncMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        err = httpx.HTTPStatusError(
            "401", request=AsyncMock(), response=mock_response,
        )
        with patch("backend.routers.analyze.analyze_content",
                   new=AsyncMock(side_effect=err)):
            resp = client.post(
                "/api/analyze",
                json={"images": [make_valid_b64()], "text": "hi"},
            )
            assert resp.status_code == 502

    def test_value_error_returns_502(self, client):
        with patch("backend.routers.analyze.analyze_content",
                   new=AsyncMock(side_effect=ValueError("无法解析 JSON"))):
            resp = client.post(
                "/api/analyze",
                json={"images": [make_valid_b64()], "text": "hi"},
            )
            assert resp.status_code == 502
            assert "无法解析" in resp.json()["detail"]

    def test_unexpected_error_returns_500(self, client):
        with patch("backend.routers.analyze.analyze_content",
                   new=AsyncMock(side_effect=RuntimeError("未知错误"))):
            resp = client.post(
                "/api/analyze",
                json={"images": [make_valid_b64()], "text": "hi"},
            )
            assert resp.status_code == 500


class TestRequestIDMiddleware:
    """请求 ID 中间件"""

    def test_response_includes_request_id(self, client):
        resp = client.get("/health")
        assert "x-request-id" in resp.headers or "X-Request-ID" in resp.headers

    def test_custom_request_id_echoed_back(self, client):
        custom_id = "test-12345"
        resp = client.get("/health", headers={"X-Request-ID": custom_id})
        assert resp.headers.get("x-request-id") == custom_id \
            or resp.headers.get("X-Request-ID") == custom_id