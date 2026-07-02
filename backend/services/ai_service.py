"""
AI Service — 调用千问（百炼）qwen3.6-plus 多模态模型进行风险分析
模型：qwen3.6-plus（支持图片+文字联合分析）
API：OpenAI 兼容端点 https://dashscope.aliyuncs.com/compatible-mode/v1
"""

import json
import os
import httpx
from backend.models.schemas import RiskItem, SuggestionItem

# ── 配置 ──────────────────────────────────────────────
DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
DASHSCOPE_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
MODEL_NAME = "qwen3.6-plus"  # 支持图片+文字，request_modality: Image+Text+Video

# ── 风险定义（来自 Imago Obscura）────────────────────────
RISK_DEFINITIONS = """
## 5 类图片隐私风险定义（用于分析儿童社交媒体分享内容）

### R1 自我披露风险（Self-Disclosure Risk）
意外暴露个人习惯、健康状况、生活事件。
示例：生日蜡烛暴露孩子年龄、药瓶暴露健康问题、书架推断政治倾向、零食照片暴露饮食习惯。

### R2 身份暴露风险（Identity Exposure Risk）
通过可见的身份特征识别个人。
示例：独特纹身、虹膜、孩子全名出现在背景中、ID卡、邮件地址、护照。

### R3 机密信息泄露（Confidential Information Leakage）
背景中可见的商业/私人敏感信息。
示例：白板上的项目计划、电脑屏幕显示账号密码、桌面文件、成绩单、工作文件。

### R4 位置暴露风险（Location Exposure Risk）
可识别地理位置的建筑、地标、环境信息。
示例：学校标志/校服、窗外城市天际线可定位住址、门牌号、常去的公园/商场/医院标志、快递单。

### R5 旁观者风险（Bystander Risk）
背景中非自愿被拍摄的路人（尤其是其他儿童）的隐私。
示例：街上无辜路人、商场顾客、其他孩子、学校/幼儿园活动中的旁观者家长。
"""

# ── Prompt 模板 ─────────────────────────────────────────
SYSTEM_PROMPT = f"""你是一个专业的儿童隐私安全分析助手。

## 你的任务
用户即将在社交媒体发布多张图片和一段文字。你的任务是帮助识别其中可能危害儿童隐私的风险。

{RISK_DEFINITIONS}

## 输出格式（严格 JSON，不要有 markdown 代码块，不要有其他任何文字）
请以以下 JSON 格式返回分析结果：

{{
  "risks": [
    {{
      "id": "R1" | "R2" | "R3" | "R4" | "R5",
      "type": "风险类型中文名",
      "level": "H" | "M" | "L",
      "description": "具体描述",
      "source": "image0" | "image1" | ... | "text" | "both"
    }}
  ],
  "suggestions": [
    {{"text": "针对该风险的修改建议"}}
  ]
}}

## 判断规则
- risks 数组：如果没有检测到任何风险，返回空数组 []
- suggestions 数组：针对每个检测到的风险给出修改建议，如果没有风险则返回空数组 []
- level: H=高风险（直接可定位/识别身份），M=中风险（可能暴露信息），L=低风险（轻微隐私提示）
- source: 风险来自哪张图片(image0-8)、文字(text)还是两者结合(both)
- 如果所有图片和文字均无明显风险，risks 和 suggestions 均返回空数组 []

## 重要注意事项
- 重点关注儿童（尤其是 12 岁以下）的隐私保护
- 需要综合分析多张图片之间的关联，以及图片与文字的关联
- 孩子没有同意权，分享的后果由孩子终身承担，尤其要注意
- 只返回 JSON，不要有任何解释或其他内容
"""

USER_PROMPT_TEMPLATE = """## 用户输入

**图片内容**：请看用户上传的 {num_images} 张图片。

**文字说明**：
{text}

请分析这 {num_images} 张图片和文字说明，识别可能危害儿童隐私的风险，并给出修改建议。"""


# ── 核心分析函数 ─────────────────────────────────────────
async def analyze_content(images_b64: list, text: str) -> dict:
    """
    调用千问 qwen3.6-plus 多模态模型进行风险分析。

    Args:
        images_b64: Base64 编码的图片列表（可能带 data:image/... 前缀）
        text: 用户输入的文字说明

    Returns:
        dict，符合 AnalyzeResponse 结构
    """
    # 清理 base64 字符串（去掉 data URI 前缀）
    cleaned_images = []
    for img in images_b64:
        if "," in img:
            img = img.split(",", 1)[1]
        cleaned_images.append(img)

    text_section = text if text.strip() else "（用户未输入文字说明）"

    user_prompt = USER_PROMPT_TEMPLATE.format(
        num_images=len(cleaned_images),
        text=text_section
    )

    # 构造多张图片的 content 列表
    image_contents = []
    for b64 in cleaned_images:
        image_contents.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{b64}"
            }
        })
    image_contents.append({
        "type": "text",
        "text": user_prompt
    })

    # OpenAI 兼容格式（Dashscope compatible-mode）
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": image_contents
            }
        ],
        "max_tokens": 1536,
        "temperature": 0.3
    }

    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{DASHSCOPE_API_URL}/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        result = response.json()

    # 解析模型返回内容（OpenAI 兼容格式）
    choices = result.get("choices", [])
    if not choices:
        raise ValueError(f"API 返回格式异常：{result}")

    raw_text = choices[0].get("message", {}).get("content", "").strip()

    # 提取 JSON（可能有 markdown 包装）
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        # 尝试从文本中提取 JSON
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(raw_text[start:end])
        else:
            raise ValueError(f"无法解析模型返回内容: {raw_text[:500]}")

    # 规范化返回
    risks = [RiskItem(**r) for r in parsed.get("risks", [])]
    suggestions = [SuggestionItem(**s) for s in parsed.get("suggestions", [])]

    return {
        "risks": risks,
        "suggestions": suggestions
    }