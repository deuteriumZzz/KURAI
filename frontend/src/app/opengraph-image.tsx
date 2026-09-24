import { ImageResponse } from "next/og";

export const alt = "KURAI — ведущие нейросети в одном терминале";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** OG-картинка для ссылок в Telegram и соцсетях: сетка, знак, заголовок, cyan-линия. */
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#070A0E",
          backgroundImage: "linear-gradient(#131A22 1px, transparent 1px), linear-gradient(90deg, #131A22 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "#E4EEF7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 64 64">
            <rect width="64" height="64" fill="#0D1218" />
            <path d="M8 18V8h10M56 46v10H46" fill="none" stroke="#00E8F0" strokeWidth="3" />
            <path d="M22 14v36" stroke="#E4EEF7" strokeWidth="6" />
            <path d="M44 14 28 32l16 18" fill="none" stroke="#00E8F0" strokeWidth="6" />
          </svg>
          <span style={{ fontSize: 40, letterSpacing: 14 }}>KURAI</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 76, lineHeight: 1.05 }}>Ведущие нейросети —</span>
          <span style={{ fontSize: 76, lineHeight: 1.05, color: "#00E8F0" }}>в одном терминале.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#72859B" }}>
          <span>Текст · изображения · видео · голос</span>
          <span>цена до отправки</span>
        </div>
      </div>
    ),
    size,
  );
}
