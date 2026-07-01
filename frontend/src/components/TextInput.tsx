"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function TextInput({ value, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-primary-light h-full flex flex-col">
      <h2 className="text-base font-semibold text-primary mb-3">✍️ 文字说明</h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`例如：今天带儿子去 XX 小学报名了，真开心！\n\n（也可以先不上传文字，直接分析图片）`}
        className="flex-1 w-full resize-none rounded-xl border border-primary-light focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none p-3 text-sm text-gray-700 leading-relaxed placeholder:text-gray-300"
        style={{ minHeight: "200px" }}
      />
      <div className="mt-2 text-xs text-gray-400 text-right">
        {value.length} 字符
      </div>
    </div>
  );
}