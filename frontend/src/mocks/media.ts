/** Локальные SVG-заглушки вместо результатов генерации (никаких внешних запросов). */
const HUES = [
  ["#111513", "#1f2622"],
  ["#121012", "#2a1b22"],
  ["#0f1311", "#232a1f"],
  ["#131315", "#1f1d2b"],
];

export function placeholderImage(i: number, w = 512, h = 512, label = "KURAI · превью"): string {
  const [a, b] = HUES[i % HUES.length] as [string, string];
  const x = 80 + ((i * 97) % (w - 160));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<rect x="${x}" y="${h * 0.2}" width="${w * 0.22}" height="${h * 0.44}" fill="none" stroke="#3a433d"/>
<rect x="${w * 0.12}" y="${h * 0.32}" width="${w * 0.22}" height="${h * 0.3}" fill="none" stroke="#3a433d"/>
<line x1="0" y1="${h * 0.72}" x2="${w}" y2="${h * 0.64}" stroke="#e33a73" stroke-width="2"/>
<text x="16" y="${h - 16}" fill="#90938c" font-family="monospace" font-size="14">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
