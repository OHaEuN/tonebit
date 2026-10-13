"use client";

import { useId } from "react";

interface UploadButtonProps {
  disabled?: boolean;
  onFile: (file: File) => void;
  variant?: "primary" | "secondary";
}

const STYLES = {
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "border border-line bg-card hover:bg-accent-soft",
} as const;

/** capture 속성을 안 붙여야 iOS에서 '사진 보관함'도 고를 수 있다 */
export function UploadButton({ disabled = false, onFile, variant = "secondary" }: UploadButtonProps) {
  const id = useId();
  return (
    <>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="peer sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        className={`inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-3 font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${STYLES[variant]}`}
      >
        사진 올리기
      </label>
    </>
  );
}
