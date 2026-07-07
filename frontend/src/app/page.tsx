"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import UploadPanel from "@/components/UploadPanel";
import TextInput from "@/components/TextInput";
import RiskReport from "@/components/RiskReport";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { AnalysisResult } from "@/types";
import axios from "axios";
import imageCompression from "browser-image-compression";

// API 基础地址：默认相对路径（同源走 Nginx 反代）；可用 NEXT_PUBLIC_API_URL 覆盖
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// 客户端日志上报：把浏览器错误发到后端，便于排查
function reportClientLog(level: string, message: string, extra?: any) {
  try {
    const body = JSON.stringify({
      level,
      message,
      url: window.location.href,
      ua: navigator.userAgent,
      extra,
      timestamp: new Date().toISOString(),
    });
    // navigator.sendBeacon 最可靠（页面关闭也能发）
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/client-log", body);
    } else {
      fetch("/api/client-log", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // 静默失败
  }
}

/* ── 页面组件 ──────────────────────────────── */
export default function Home() {
  const [images, setImages] = useState<{ file: File; dataUrl: string }[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 9;

  // 全局错误捕获（生产环境调试用）
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientLog("error", event.message, { filename: event.filename, lineno: event.lineno });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason);
      reportClientLog("unhandledrejection", reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  /* ── 处理图片选择 ──────────────────────────── */
  const handleImagesChange = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" 不是图片文件`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" 超过 10MB`);
        return;
      }
      validFiles.push(file);
    }

    const remaining = MAX_IMAGES - images.length;
    if (validFiles.length > remaining) {
      setError(`最多还能选 ${remaining} 张图片（最多 ${MAX_IMAGES} 张）`);
      return;
    }

    setError(null);
    setResult(null);
    setHasAnalyzed(false);

    const newImages = validFiles.map((file) => {
      const reader = new FileReader();
      return new Promise<{ file: File; dataUrl: string }>((resolve) => {
        reader.onload = (e) => {
          resolve({ file, dataUrl: e.target?.result as string });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newImages).then((loaded) => {
      setImages((prev) => [...prev, ...loaded]);
    });
  }, [images.length]);

  /* ── 移除单张图片 ──────────────────────────── */
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
    setHasAnalyzed(false);
  };

  /* ── 提交分析 ──────────────────────────────── */
  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError("请先上传至少一张图片");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCompressing(true);

    try {
      const compressOptions = {
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        maxFileSize: 2 * 1024 * 1024,
        fileType: "image/jpeg" as const,
      };

      reportClientLog("info", "analyze:start", { imageCount: images.length, textLen: text.length });

      const compressedDataUrls = await Promise.all(
        images.map(async (img) => {
          if (img.file.size < 1024 * 1024) return img.dataUrl;
          const compressed = await imageCompression(img.file, compressOptions);
          return await imageCompression.getDataUrlFromFile(compressed);
        })
      );

      setCompressing(false);

      reportClientLog("info", "analyze:request-send", { url: `${API_BASE_URL}/api/analyze` });

      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {
        images: compressedDataUrls,
        text,
      }, {
        timeout: 130000, // 后端 120s 超时，前端留 10s 余量
      });
      reportClientLog("info", "analyze:response-ok", { status: response.status, risks: response.data?.risks?.length });
      setResult(response.data);
      setHasAnalyzed(true);
    } catch (err: any) {
      setCompressing(false);
      // 关键：把错误详细信息上报到服务器
      reportClientLog("error", "analyze:failed", {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data,
        requestUrl: `${API_BASE_URL}/api/analyze`,
      });
      const detail = err.response?.data?.detail || err.message;
      setError(`分析失败: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  /* ── 重置 ──────────────────────────────────── */
  const handleReset = () => {
    setImages([]);
    setText("");
    setResult(null);
    setError(null);
    setHasAnalyzed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── 渲染 ──────────────────────────────────── */
  return (
    <main className="min-h-screen bg-[#F9F6FB]">
      {/* 顶部导航 */}
      <header className="bg-primary-dark text-white py-4 px-6 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <span className="text-2xl">💎</span>
          <h1 className="text-xl font-bold">Future Child Posting</h1>
          <span className="text-primary-light text-sm ml-auto">
            AI 儿童隐私风险检测
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* 说明区 */}
        <section className="bg-white rounded-xl p-5 shadow-sm border border-primary-light">
          <h2 className="text-base font-semibold text-primary mb-2">
            📋 使用说明
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            上传您计划在社交媒体发布的<strong>图片（最多 9 张）</strong>，
            并输入相应的<strong>文字说明</strong>，AI 将帮您分析其中可能存在的儿童隐私风险，
            并给出修改建议。请注意：本工具仅做风险提示，最终发布决定由您自行判断。
          </p>
        </section>

        {/* 输入区域：图片 + 文字 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UploadPanel
            images={images}
            fileInputRef={fileInputRef}
            onImagesChange={handleImagesChange}
            onRemoveImage={handleRemoveImage}
            onReset={handleReset}
            maxImages={MAX_IMAGES}
          />
          <TextInput value={text} onChange={setText} />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* 分析按钮 */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleAnalyze}
            disabled={images.length === 0 || loading || compressing}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              images.length === 0 || loading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-accent-pink hover:bg-pink-700 shadow-md hover:shadow-lg"
            }`}
          >
            {compressing ? "📦 压缩图片中..." : loading ? "🔍 分析中..." : images.length > 0 ? `🔍 开始分析（${images.length} 张）` : "🔍 开始分析"}
          </button>
          {hasAnalyzed && (
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-all"
            >
              🔄 重新开始
            </button>
          )}
        </div>

        {/* 风险报告 */}
        {result && (
          <ErrorBoundary>
            <RiskReport
              risks={result.risks}
              suggestions={result.suggestions}
              images={images.map((img) => img.dataUrl)}
              text_suggestions={result.text_suggestions}
            />
          </ErrorBoundary>
        )}
      </div>
    </main>
  );
}