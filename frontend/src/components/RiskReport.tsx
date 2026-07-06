"use client";

interface RiskItem {
  id: string;
  type: string;
  level: string;
  description: string;
  source: string;
  image_index: number | null;
  bbox: [number, number, number, number] | null;
}

interface SuggestionItem {
  text: string;
}

interface Props {
  risks: RiskItem[];
  suggestions: SuggestionItem[];
  images: string[];
}

/* ── 常量 ──────────────────────────────── */
const LEVEL_STYLE: Record<string, { bg: string; badge: string; boxColor: string }> = {
  H: { bg: "bg-red-50", badge: "bg-red-500", boxColor: "border-red-500" },
  M: { bg: "bg-amber-50", badge: "bg-amber-500", boxColor: "border-orange-400" },
  L: { bg: "bg-blue-50", badge: "bg-blue-500", boxColor: "border-blue-400" },
};

const LEVEL_LABEL: Record<string, string> = { H: "高", M: "中", L: "低" };

/* ── 工具函数 ──────────────────────────── */
// 按 image_index 分组，image_index=null 的归为"纯文字风险"
function groupRisks(risks: RiskItem[]) {
  const imageGroups = new Map<number, RiskItem[]>();
  const textRisks: RiskItem[] = [];

  for (const risk of risks) {
    if (risk.image_index === null) {
      textRisks.push(risk);
    } else {
      if (!imageGroups.has(risk.image_index)) {
        imageGroups.set(risk.image_index, []);
      }
      imageGroups.get(risk.image_index)!.push(risk);
    }
  }
  return { imageGroups, textRisks };
}

// 取最高风险等级
function highestLevel(risks: RiskItem[]): string {
  if (risks.some((r) => r.level === "H")) return "H";
  if (risks.some((r) => r.level === "M")) return "M";
  return "L";
}

export default function RiskReport({ risks, suggestions, images }: Props) {
  const { imageGroups, textRisks } = groupRisks(risks);
  const hasRisks = risks.length > 0;

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-primary-dark">📊 风险分析报告</h2>
        {hasRisks ? (
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
            检测到 {risks.length} 个风险点
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
            ✅ 暂未发现明显风险
          </span>
        )}
      </div>

      {/* ── 有图片风险：按图分组展示 ──────────────────────────── */}
      {imageGroups.size > 0 && (
        <div className="space-y-4">
          {/* 全局汇总标签 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">🖼️ 图片风险</span>
            <span className="text-xs text-gray-400">{imageGroups.size} 张图片存在风险</span>
          </div>

          {/* 每张有风险的图 */}
          {Array.from(imageGroups.entries()).map(([imgIdx, imgRisks]) => {
            const imgStyle = LEVEL_STYLE[highestLevel(imgRisks)] || LEVEL_STYLE["M"];
            const imgSrc = images[imgIdx];

            return (
              <div
                key={imgIdx}
                className={`rounded-xl border ${imgStyle.bg} ${imgStyle.boxColor} border-2 overflow-hidden`}
              >
                {/* 图片 + 标注叠加 */}
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={`图片 ${imgIdx + 1}`}
                    className="w-full max-h-96 object-contain bg-black/5"
                  />

                  {/* 每个 bbox 区域 */}
                  {imgRisks.map((risk, ri) => {
                    if (!risk.bbox) return null;
                    const [x, y, w, h] = risk.bbox;
                    const rStyle = LEVEL_STYLE[risk.level] || LEVEL_STYLE["M"];
                    return (
                      <div
                        key={ri}
                        className="absolute group cursor-pointer"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${w}%`,
                          height: `${h}%`,
                        }}
                      >
                        {/* 边框 */}
                        <div
                          className={`w-full h-full border-2 ${rStyle.boxColor} bg-${rStyle.badge}/10 rounded-sm`}
                          style={{ backgroundColor: `${rStyle.badge}22` }}
                        />
                        {/* 悬停标签 */}
                        <div className="absolute left-0 top-0 -translate-y-full mb-1 hidden group-hover:block z-10 whitespace-nowrap">
                          <div className={`${rStyle.badge} text-white text-xs px-2 py-0.5 rounded-t-md font-bold shadow-lg`}>
                            {LEVEL_LABEL[risk.level] || risk.level} · {risk.type}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 图片内风险列表 */}
                <div className="p-4 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">
                    图片 {imgIdx + 1} — {imgRisks.length} 个风险点
                  </p>
                  {imgRisks.map((risk, ri) => {
                    const rStyle = LEVEL_STYLE[risk.level] || LEVEL_STYLE["M"];
                    return (
                      <div key={ri} className="flex items-start gap-2 text-sm">
                        <span className={`${rStyle.badge} text-white text-xs px-1.5 py-0.5 rounded-full font-bold mt-0.5 shrink-0`}>
                          {LEVEL_LABEL[risk.level]}
                        </span>
                        <div>
                          <span className="font-semibold text-gray-700">[{risk.id}] {risk.type}</span>
                          <span className="text-gray-500"> — {risk.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 纯文字风险 ──────────────────────────── */}
      {textRisks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            📝 文字风险
          </p>
          <div className="space-y-2">
            {textRisks.map((risk, i) => {
              const rStyle = LEVEL_STYLE[risk.level] || LEVEL_STYLE["M"];
              return (
                <div
                  key={i}
                  className={`${rStyle.bg} rounded-lg p-3 border border-gray-100 flex items-start gap-2`}
                >
                  <span className={`${rStyle.badge} text-white text-xs px-1.5 py-0.5 rounded-full font-bold mt-0.5 shrink-0`}>
                    {LEVEL_LABEL[risk.level]}
                  </span>
                  <div className="text-sm">
                    <span className="font-semibold text-gray-700">[{risk.id}] {risk.type}</span>
                    <span className="text-gray-600 ml-1">— {risk.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 无风险展示 ──────────────────────────── */}
      {!hasRisks && (
        <div className="bg-green-50 rounded-xl p-6 text-center border border-green-100">
          <span className="text-4xl">✅</span>
          <p className="mt-2 text-sm text-green-700 font-medium">
            您的图片和文字暂未检测到明显隐私风险
          </p>
          <p className="mt-1 text-xs text-green-600">
            但请仍注意：AI 分析有一定局限性，最终发布决定由您自行判断
          </p>
        </div>
      )}

      {/* ── 修改建议 ──────────────────────────── */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-primary-light">
          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
            💡 修改建议
          </h3>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-accent-pink mt-0.5 shrink-0">→</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 免责声明 */}
      <p className="text-xs text-gray-400 text-center leading-relaxed">
        ⚠️ 本工具仅供风险提示，AI 分析结果有一定误判率，不代表最终安全判断。
        请结合实际情况自行决定是否发布。
      </p>
    </section>
  );
}
