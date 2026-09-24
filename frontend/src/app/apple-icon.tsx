import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0D1218" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M8 18V8h10M56 46v10H46" fill="none" stroke="#00E8F0" strokeWidth="3" />
          <path d="M22 14v36" stroke="#E4EEF7" strokeWidth="6" />
          <path d="M44 14 28 32l16 18" fill="none" stroke="#00E8F0" strokeWidth="6" />
        </svg>
      </div>
    ),
    size,
  );
}
