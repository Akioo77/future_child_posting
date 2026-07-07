"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { RiskItem, SuggestionItem, TextSuggestionItem } from "@/types";

interface Props {
  risks: RiskItem[];
  suggestions: SuggestionItem[];
  images: string[];
  text_suggestions?: TextSuggestionItem[];
  activeRiskIndex?: number;
  onRiskClick?: (imgIdx: number, riskIdx: number) => void;
}

/* ── 常量 ──────────────────────────────── */
const LEVEL_STYLE: Record<string, { bg: string; badge: string; boxColor: string; color: string }> = {
  H: { bg: "bg-red-50", badge: "bg-red-500", boxColor: "border-red-500", color: "#ef4444" },
  M: { bg: "bg-amber-50", badge: "bg-amber-500", boxColor: "border-orange-400", color: "#f97316" },
  L: { bg: "bg-blue-50", badge: "bg-blue-500", boxColor: "border-blue-400", color: "#3b82f6" },
};
const LEVEL_LABEL: Record<string, string> = { H: "高", M: "中", L: "低" };

/* ── 工具函数 ──────────────────────────── */
function groupRisks(risks: RiskItem[]) {
  const imageGroups = new Map<number, RiskItem[]>();
  const textRisks: RiskItem[] = [];
  for (const risk of risks) {
    // source=both 且有 image_index：计入对应图片组（跨图综合分析）
    if (risk.image_index !== null) {
      if (!imageGroups.has(risk.image_index)) imageGroups.set(risk.image_index, []);
      imageGroups.get(risk.image_index)!.push(risk);
    } else {
      // source=text 或 source=both 但无 image_index → 纯文字风险
      textRisks.push(risk);
    }
  }
  return { imageGroups, textRisks };
}

function highestLevel(risks: RiskItem[]): string {
  if (risks.some((r) => r.level === "H")) return "H";
  if (risks.some((r) => r.level === "M")) return "M";
  return "L";
}

/* ── 单张图片 + bbox 标注组件 ─────────────────── */
interface ImageBoxProps {
  imgSrc: string;
  imgIdx: number;
  risks: RiskItem[];
  activeRiskIdx?: number | null;
  onRiskClick?: (riskIdx: number) => void;
}

function ImageRiskBox({ imgSrc, imgIdx, risks, activeRiskIdx, onRiskClick }: ImageBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderRect, setRenderRect] = useState<{ l: number; t: number; w: number; h: number } | null>(null);

  // 图片加载完成后计算渲染区域
  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0 || img.naturalWidth === 0) return;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = cw / ch;
    let rw: number, rh: number;

    if (imgAspect > containerAspect) {
      rw = cw;
      rh = cw / imgAspect;
    } else {
      rh = ch;
      rw = ch * imgAspect;
    }

    setRenderRect({
      l: (cw - rw) / 2,
      t: (ch - rh) / 2,
      w: rw,
      h: rh,
    });
  }, []);

  // 窗口 resize 时重新计算
  useEffect(() => {
    const observer = new ResizeObserver(() => handleImgLoad());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [handleImgLoad]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* 图片容器 */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: "4/3", maxHeight: "20rem" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imgSrc}
          alt={`图片 ${imgIdx + 1}`}
          className="absolute inset-0 w-full h-full object-contain"
          onLoad={handleImgLoad}
        />

        {/* bbox 标注层 */}
        {renderRect && imgRef.current && risks.map((risk, ri) => {
          if (!risk.bbox) return null;
          const [bx, by, bw, bh] = risk.bbox; // 百分比 0-100
          const rStyle = LEVEL_STYLE[risk.level] || LEVEL_STYLE["M"];

          // z-index 按风险等级：H=3（最顶层）, M=2, L=1
          const zIdx = risk.level === "H" ? 3 : risk.level === "M" ? 2 : 1;

          // clamp bbox 到 [0, 100]，防止 AI 幻觉坐标越界
          const clampedX = Math.max(0, Math.min(100, bx));
          const clampedY = Math.max(0, Math.min(100, by));
          const clampedW = Math.max(0, Math.min(100 - clampedX, bw));
          const clampedH = Math.max(0, Math.min(100 - clampedY, bh));

          const absLeft = renderRect.l + (clampedX / 100) * renderRect.w;
          const absTop = renderRect.t + (clampedY / 100) * renderRect.h;
          const absW = (clampedW / 100) * renderRect.w;
          const absH = (clampedH / 100) * renderRect.h;

          // 过滤掉尺寸太小的无效框（AI 幻觉产物）
          if (absW < 4 || absH < 4) return null;

          const isActive = ri === activeRiskIdx;
          const activeBorder = isActive ? "4px" : "2.5px";
          const activeBg = isActive ? rStyle.color + "55" : rStyle.color + "22";

          return (
            <div
              key={ri}
              className="absolute group cursor-pointer transition-all duration-200"
              style={{
                left: `${absLeft}px`,
                top: `${absTop}px`,
                width: `${absW}px`,
                height: `${absH}px`,
                zIndex: isActive ? 10 : zIdx,
                outline: isActive ? `2px solid ${rStyle.color}` : "none",
                outlineOffset: "2px",
              }}
              onClick={() => onRiskClick && onRiskClick(ri)}
            >
              {/* 边框：用描边代替填充，避免遮挡其他框 */}
              <div
                className="w-full h-full rounded-sm transition-all duration-200"
                style={{
                  border: `${activeBorder} solid ${rStyle.color}`,
                  backgroundColor: activeBg,
                }}
              />
              {/* 悬停标签 */}
              <div className="absolute left-0 top-0 -translate-y-full mb-1 hidden group-hover:block whitespace-nowrap">
                <div
                  className="text-white text-xs px-2 py-0.5 rounded-t-md font-bold shadow-lg"
                  style={{ backgroundColor: rStyle.color }}
                >
                  {LEVEL_LABEL[risk.level]} · {risk.type}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图片内风险列表 */}
      <div className="p-4 space-y-2">
        <p className="text-xs text-gray-500 font-medium">
          图片 {imgIdx + 1} — {risks.length} 个风险点
        </p>
        {risks.map((risk, ri) => {
          const rStyle = LEVEL_STYLE[risk.level] || LEVEL_STYLE["M"];
          const sourceLabel = risk.source.startsWith("image")
            ? "图片来源"
            : risk.source === "both" ? "图文结合"
            : risk.source === "text" ? "文字来源"
            : risk.source;
          return (
            <div
              key={ri}
              onClick={() => onRiskClick && onRiskClick(ri)}
              className={`flex items-start gap-2 text-sm cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${activeRiskIdx === ri ? "bg-blue-50" : ""}`}
            >
              <span className={`${rStyle.badge} text-white text-xs px-1.5 py-0.5 rounded-full font-bold mt-0.5 shrink-0`}>
                {LEVEL_LABEL[risk.level]}
              </span>
              <div>
                <span className="font-semibold text-gray-700">[{risk.id}] {risk.type}</span>
                <span className="text-gray-400"> · {sourceLabel}</span>
                <span className="text-gray-500"> — {risk.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



/* ── 主组件 ─────────────────────────────── */
export default function RiskReport({ risks, suggestions, images, text_suggestions }: Props) {
  const { imageGroups, textRisks } = groupRisks(risks);
  const hasRisks = risks.length > 0;
  const [copied, setCopied] = useState(false);
  const [activeRisk, setActiveRisk] = useState<{ imgIdx: number; riskIdx: number } | null>(null);

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

      {/* ── 有图片风险 ──────────────────────────── */}
      {imageGroups.size > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">🖼️ 图片风险</span>
            <span className="text-xs text-gray-400">{imageGroups.size} 张图片存在风险</span>
          </div>

          {Array.from(imageGroups.entries()).map(([imgIdx, imgRisks]) => (
            <ImageRiskBox
              key={imgIdx}
              imgSrc={images[imgIdx]}
              imgIdx={imgIdx}
              risks={imgRisks}
              activeRiskIdx={activeRisk?.imgIdx === imgIdx ? activeRisk.riskIdx : null}
              onRiskClick={(riskIdx) => setActiveRisk({ imgIdx, riskIdx })}
            />
          ))}
        </div>
      )}

      {/* ── 纯文字风险 ──────────────────────────── */}
      {textRisks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">📝 文字风险</p>
          <div className="space-y-2">
            {textRisks.map((risk, i) => {
              const rStyle = LEVEL_STYLE[risk.level] || LEVEL_STYLE["M"];
              return (
                <div key={i} className={`${rStyle.bg} rounded-lg p-3 border border-gray-100 flex items-start gap-2`}>
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
          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">💡 修改建议</h3>
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

      {/* ── 文案优化 ──────────────────────────── */}
      {text_suggestions && text_suggestions.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-primary-light">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary flex items-center gap-2">✍️ 文案优化建议</h3>
            <button
              onClick={() => {
                const allRevised = text_suggestions.map(t => t.revised).join("\n");
                navigator.clipboard.writeText(allRevised).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="text-xs px-3 py-1 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
            >
              📋 复制全部修改后文案
            </button>
          </div>
          {copied && <p className="text-xs text-green-600 mb-2">✅ 已复制到剪贴板！</p>}
          <div className="space-y-3">
            {text_suggestions.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">原文</span>
                  <span className="text-sm text-gray-500 italic">{t.original}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full font-medium">修改后</span>
                  <span className="text-sm text-gray-800 font-medium flex-1">{t.revised}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(t.revised);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs text-gray-400 hover:text-primary transition-colors shrink-0"
                  >
                    📋
                  </button>
                </div>
                <p className="text-xs text-gray-400">💬 {t.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        ⚠️ 本工具仅供风险提示，AI 分析结果有一定误判率，不代表最终安全判断。
        请结合实际情况自行决定是否发布。
      </p>
    </section>
  );
}
