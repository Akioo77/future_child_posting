# Future Child Posting — 项目详细记忆

> 最后更新：2026-07-07

---

## 🎯 项目信息

- **类型**：学术研究项目（CHI/CSCW/IDC 投稿方向）
- **RQ**：AI 辅助的「发布前风险扫描」能否有效帮助父母识别和规避分享孩子内容时的隐私和伦理风险？
- **产出**：MVP 原型 + 用户研究 → 论文
- **状态**：✅ Phase 1 完成，项目从0到1全部跑通

---

## 🏗️ 技术架构（已验证）

```
前端 (Next.js :3000)  ←→  后端 (FastAPI :8000)  ←→  阿里云百炼 qwen-vl-plus
```

### 后端（FastAPI + Python）
- 入口：`backend/main.py`
- 路由：`backend/routers/analyze.py` — POST `/api/analyze`
- AI 服务：`backend/services/ai_service.py` — 调用阿里云百炼 qwen-vl-plus
- 数据模型：`backend/models/schemas.py` — Pydantic 模型
- 依赖：`backend/requirements.txt`

### 前端（Next.js 14 + TypeScript + Tailwind CSS）
- 首页：`frontend/src/app/page.tsx`
- 组件：`UploadPanel` / `TextInput` / `RiskReport`
- 构建状态：✅ `npm run build` 通过

---

## 🔌 API 设计

### POST /api/analyze

**请求**：
```json
{
  "images": ["data:image/jpeg;base64,..."],  // Base64 图片列表（最多9张）
  "text": "今天带儿子去XX小学报名了！"     // 文字说明
}
```

**响应**：
```json
{
  "risks": [
    {"id": "R4", "type": "位置暴露风险", "level": "H",
     "description": "学校名称 XX 小学 可定位孩子就读学校",
     "source": "text"}
  ],
  "suggestions": [{"text": "删除学校名称，用 XX 学校 代替"}]
}
```

---

## 🔍 风险检测类型（5类，来自 Imago Obscura）

| ID | 类型 | 说明 |
|----|------|------|
| R1 | 自我披露风险 | 生日蜡烛暴露年龄、药瓶、健康信息 |
| R2 | 身份暴露风险 | 纹身、全名、ID卡、虹膜 |
| R3 | 机密信息泄露 | 白板计划、电脑屏幕、文件 |
| R4 | 位置暴露风险 | 窗外地标、学校标志、门牌号（⚠️ VLM只能检测图片可见位置，无法解析EXIF元数据）|
| R5 | 旁观者风险 | 街上路人、其他孩子 |

---

## ✅ Phase 1 完成记录（2026-07-02）

**已完成的事项（代码层面）：**
- ✅ 后端 FastAPI + 阿里云百炼 qwen-vl-plus 多模态分析
- ✅ 前端 Next.js 完整页面（上传/文字/报告展示）
- ✅ API Key 环境变量配置（`.env`）
- ✅ 端到端联调测试
- ✅ PPT 研究介绍（20+页，含系统概览/上传界面/风险报告/技术实现）
- ✅ 虚假宣传清理（PPT 中的待开发功能描述已移除）

**修复过的问题：**
- ⚠️ ~~Minimax VL~~ → 实际使用**阿里云百炼 qwen-vl-plus**（README/架构图已更正）
- ⚠️ R4 描述修正：VLM 只能检测图片可见位置，无法解析 EXIF 元数据
- ⚠️ PPT 虚假宣传移除：拖拽上传（未实现）、文案改写（未实现）、多图标注（未实现）

---

## ⚠️ 待完成事项

- [ ] MEMORY.md / SPEC.md 同步更新（本次完成）
- [ ] Phase 2 用户研究设计（访谈大纲/实验方案）
- [ ] 论文写作框架
- [ ] 投稿目标确认（CHI/CSCW/IDC）

---

## 📁 关键文件

| 文件 | 说明 |
|------|------|
| `SPEC.md` | 项目完整规格说明 |
| `MEMORY.md` | 项目开发记忆（本文档） |
| `backend/services/ai_service.py` | AI 分析核心逻辑，Prompt 设计（千问 qwen-vl-plus）|
| `frontend/src/app/page.tsx` | 首页主逻辑 |
| `start_backend.sh` | 快速启动脚本 |
| `research_ppt.py` | 研究 PPT 生成脚本（20+页）|

---

## 🔑 配置注意事项

1. **API**: 阿里云百炼 qwen-vl-plus（**不是** Minimax）
2. **API Key**: 在 `backend/.env` 中配置 `DASHSCOPE_API_KEY`（已配置）
3. **代理**: 需开启 Clash Verge（7897端口）访问百炼 API
4. **PYTHONPATH**: 启动后端时需要设置 `PYTHONPATH=.`
5. **CORS**: 当前允许所有来源（`allow_origins=["*"]`），生产环境需限制

---

## 🚀 启动方式

```bash
# 后端
cd backend
uvicorn main:app --reload --port 8000

# 前端（新终端）
cd frontend
npm run dev
```

---

_最后更新：2026-07-07 04:02 — 同步文档与实际代码状态_
