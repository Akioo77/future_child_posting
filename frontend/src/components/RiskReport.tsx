interface RiskItem {
  id: string;
  type: string;
  level: string;
  description: string;
  source: string;
}

interface SuggestionItem {
  text: string;
}

interface Props {
  risks: RiskItem[];
  suggestions: SuggestionItem[];
}

const LEVEL_COLORS: Record<string, { bg: string; badge: string; label: string }> = {
  H: { bg: "bg-red-50", badge: "bg-red-500", label: "高风险" },
  M: { bg: "bg-amber-50", badge: "bg-amber-500", label: "中风险" },
  L: { bg: "bg-blue-50", badge: "bg-blue-500", label: "低风险" },
};

const SOURCE_LABELS: Record<string, string> = {
  image: "图片来源",
  text: "文字来源",
  both: "图文结合",
};

export default function RiskReport({ risks, suggestions }: Props) {
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

      {/* 风险列表 */}
      {hasRisks ? (
        <div className="space-y-3">
          {risks.map((risk, i) => {
            const levelInfo = LEVEL_COLORS[risk.level] || LEVEL_COLORS["M"];
            return (
              <div
                key={i}
                className={`${levelInfo.bg} rounded-xl p-4 border border-gray-100`}
              >
                <div className="flex items-start gap-3">
                  {/* 风险等级徽章 */}
                  <span
                    className={`${levelInfo.badge} text-white text-xs px-2 py-0.5 rounded-full font-bold mt-0.5 shrink-0`}
                  >
                    {risk.level === "H" ? "高" : risk.level === "M" ? "中" : "低"}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-800">
                        {risk.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        [{risk.id}] · {SOURCE_LABELS[risk.source] || risk.source}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {risk.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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

      {/* 修改建议 */}
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