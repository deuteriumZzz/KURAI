import { ImageResponse } from "next/og";

export const alt = "KURAI — сотни нейросетей в одном чате, цена до отправки";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** OG-картинка для ссылок в Telegram и соцсетях: графит, знак, заголовок, лаймовая строка. */
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
          background: "#151515",
          backgroundImage: "linear-gradient(#1f1f1f 1px, transparent 1px), linear-gradient(90deg, #1f1f1f 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "#f2f2f2",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 64 64">
            <rect width="64" height="64" fill="#151515" />
            <path d="M8 18V8h10M56 46v10H46" fill="none" stroke="#d8ec98" strokeWidth="3" />
            <path d="M22 14v36" stroke="#f2f2f2" strokeWidth="6" />
            <path d="M44 14 28 32l16 18" fill="none" stroke="#d8ec98" strokeWidth="6" />
          </svg>
          <span style={{ fontSize: 40, letterSpacing: 14 }}>KURAI</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 76, lineHeight: 1.05 }}>Сотни нейросетей</span>
          <span style={{ fontSize: 76, lineHeight: 1.05, color: "#d8ec98" }}>в одном чате</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#949494" }}>
          <span>Текст · research · изображения · слайды</span>
          <span>цена до отправки</span>
        </div>
      </div>
    ),
    size,
  );
}
