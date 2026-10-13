import { ImageResponse } from "next/og";
import { BrandMark } from "@/features/share/BrandMark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandMark size={size.width} />, size);
}
