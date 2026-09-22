import { ImageResponse } from "next/og";
import { BrandOgCard } from "@/lib/og-image-card";

export const alt = "Huge Recruitment";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <BrandOgCard headline="Specialist industrial recruitment across the UK" />,
    { ...size },
  );
}
