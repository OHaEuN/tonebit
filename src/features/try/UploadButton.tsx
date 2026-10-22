"use client";

import { useId } from "react";
import { BUTTON } from "@/components/styles";

interface UploadButtonProps {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  /** 여러 장을 한 번에 고를 수 있게 한다 */
  multiple?: boolean;
  variant?: "primary" | "secondary";
  /** 모바일은 이 버튼 하나가 카메라·앨범 선택창을 띄운다 */
  label?: string;
}

/** 버튼과 같은 모양. label이라 disabled·focus는 앞의 input(peer) 상태로 그린다 */
const PEER = "cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-35 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg";

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
        className={`${BUTTON[variant]} ${PEER}`}
      >
        {label}
      </label>
    </>
  );
}
