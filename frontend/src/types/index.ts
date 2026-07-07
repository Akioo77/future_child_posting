/**
 * 共享类型定义 — 前后端一致的接口契约
 */

export interface RiskItem {
  id: string;
  type: string;
  level: string;
  description: string;
  source: string;
  image_index: number | null;
  bbox: [number, number, number, number] | null;
}

export interface SuggestionItem {
  text: string;
}

export interface TextSuggestionItem {
  original: string;
  revised: string;
  reason: string;
}

export interface AnalysisResult {
  risks: RiskItem[];
  suggestions: SuggestionItem[];
  text_suggestions: TextSuggestionItem[];
}