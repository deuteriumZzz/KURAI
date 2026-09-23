export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const ALLOWED = [/^image\//, /^application\/pdf$/, /^text\//, /officedocument/, /^application\/msword$/, /^application\/vnd\.ms-excel$/, /^audio\//];

export type FileMeta = { name: string; size: number; type: string };

/** Проверка вложения до загрузки. Сервер проверяет ещё раз — по содержимому, а не по расширению. */
export function fileError(f: FileMeta): string | null {
  if (f.size > MAX_FILE_BYTES) return `«${f.name}» больше 50 МБ — сожмите файл или разделите на части`;
  if (f.size === 0) return `«${f.name}» пустой`;
  if (!ALLOWED.some((re) => re.test(f.type))) return `«${f.name}»: такой формат пока не поддерживается — подойдут фото, PDF, DOCX, XLSX, TXT, аудио`;
  return null;
}

export function fileKind(type: string): "image" | "pdf" | "doc" | "sheet" | "audio" | "text" {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("audio/")) return "audio";
  if (/sheet|excel|csv/.test(type)) return "sheet";
  if (/word|document/.test(type)) return "doc";
  return "text";
}
