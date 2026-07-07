"use client";

import { ChangeEvent, RefObject } from "react";

interface ImageItem {
  file: File;
  dataUrl: string;
}

interface Props {
  images: ImageItem[];
  fileInputRef: RefObject<HTMLInputElement>;
  onImagesChange: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  onReset: () => void;
  maxImages: number;
}

export default function UploadPanel({
  images,
  fileInputRef,
  onImagesChange,
  onRemoveImage,
  onReset,
  maxImages,
}: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onImagesChange(files);
    }
    // 清空 input，允许重复选同一张图
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-primary-light h-full">
      <h2 className="text-base font-semibold text-primary mb-3 flex items-center gap-2">
        📷 上传图片
        <span className="text-xs font-normal text-gray-400 ml-auto">
          {images.length} / {maxImages} 张
        </span>
      </h2>

      {/* 图片网格 */}
      {images.length > 0 ? (
        <div className="space-y-3">
          {/* 图片预览网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={`图片 ${i + 1}`}
                  className="w-full h-16 sm:h-20 object-cover rounded-lg border border-gray-200"
                />
                {/* 序号 */}
                <span className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 rounded-full">
                  {i + 1}
                </span>
                {/* 移除按钮 */}
                <button
                  onClick={() => onRemoveImage(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}

            {/* 添加按钮（还有空位时） */}
            {images.length < maxImages && (
              <label className="h-16 sm:h-20 border-2 border-dashed border-primary-light rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-light/20 transition-all">
                <span className="text-lg">+</span>
                <span className="text-xs text-gray-400">添加</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <label className="flex-1 text-center text-sm text-primary border border-primary rounded-lg py-2 cursor-pointer hover:bg-primary-light/20 transition-all">
              + 继续添加图片
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleChange}
                className="hidden"
              />
            </label>
            <button
              onClick={onReset}
              className="flex-1 text-sm text-red-500 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition-all"
            >
              🗑️ 清空全部
            </button>
          </div>
        </div>
      ) : (
        /* 空状态：上传区域 */
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary-light rounded-xl cursor-pointer hover:border-primary hover:bg-primary-light/20 transition-all py-10 sm:py-16">
          <span className="text-3xl sm:text-4xl mb-2 sm:mb-3">🖼️</span>
          <span className="text-sm text-gray-500 font-medium">点击选择图片</span>
          <span className="text-xs text-gray-400 mt-1">支持 JPG/PNG，每张最大 10MB</span>
          <span className="text-xs text-gray-400 mt-0.5">最多 {maxImages} 张图片</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}