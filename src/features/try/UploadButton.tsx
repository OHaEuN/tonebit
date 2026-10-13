"use client";

import { useId } from "react";

interface UploadButtonProps {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  /** 여러 장을 한 번에 고를 수 있게 한다 */
  multiple?: boolean;
  variant?: "primary" | "secondary";
  /** 모바일은 이 버튼 하나가 카메라·앨범 선택창을 띄운다 */
  label?: string;
}

const STYLES = {
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "border border-line bg-card hover:bg-accent-soft",
} as const;

/** capture 속성을 안 붙여야 iOS에서 '사진 보관함'도 고를 수 있다 */
export function UploadButton({ disabled = false, onFiles, multiple = false, variant = "secondary", label = "사진 올리기" }: UploadButtonProps) {
  const id = useId();
  return (
    <>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="peer sr-only"
        disabled={disabled}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        className={`inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-3 font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${STYLES[variant]}`}
      >
        {label}
      </label>
    </>
  );
}
