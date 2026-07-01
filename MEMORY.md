# Future Child Posting — 项目详细记忆

> 最后更新：2026-07-01

---

## 🎯 项目信息

- **类型**：学术研究项目（CHI/CSCW/IDC 投稿方向）
- **RQ**：AI 辅助的「发布前风险扫描」能否有效帮助父母识别和规避分享孩子内容时的隐私和伦理风险？
- **产出**：MVP 原型 + 用户研究 → 论文
- **状态**：Phase 0 完成，项目骨架搭建完毕

---

## 🏗️ 技术架构

```
前端 (Next.js :3000)  ←→  后端 (FastAPI :8000)  ←→  Minimax VL API
```

### 后端（FastAPI + Python）
- 入口：`backend/main.py`
- 路由：`backend/routers/analyze.py` — POST `/api/analyze`
- AI 服务：`backend/services/ai_service.py` — 调用 Minimax VL
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
  "image": "data:image/jpeg;base64,...",  // Base64 图片
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

## 🔍 风险检测类型（5类）

| ID | 类型 | 说明 |
|----|------|------|
| R1 | 自我披露风险 | 生日蜡烛暴露年龄、药瓶、健康信息 |
| R2 | 身份暴露风险 | 纹身、全名、ID卡、虹膜 |
| R3 | 机密信息泄露 | 白板计划、电脑屏幕、文件 |
| R4 | 位置暴露风险 | 窗外地标、学校标志、门牌号 |
| R5 | 旁观者风险 | 街上路人、其他孩子 |

---

## ⚠️ 待完成事项

- [ ] 替换真实的 Minimax API Key（当前是占位符）
- [ ] 确认代理设置（7897端口）正常工作
- [ ] 启动后端 + 前端进行联调测试
- [ ] Phase 1 用户研究设计（访谈大纲）

---

## 📁 关键文件

| 文件 | 说明 |
|------|------|
| `SPEC.md` | 项目完整规格说明 |
| `backend/services/ai_service.py` | AI 分析核心逻辑，Prompt 设计 |
| `frontend/src/app/page.tsx` | 首页主逻辑 |
| `start_backend.sh` | 快速启动脚本 |

---

## 🔑 配置注意事项

1. **Minimax API Key**：在 `backend/services/ai_service.py` 中替换 `MINIMAX_API_KEY`
2. **代理**：需开启 Clash Verge（7897端口）才能访问 Minimax API
3. **PYTHONPATH**：启动后端时需要设置 `PYTHONPATH=.`
4. **CORS**：当前允许所有来源（`allow_origins=["*"]`），生产环境需限制

---

_最后更新：2026-07-01 17:30_