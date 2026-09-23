import { describe, expect, it } from "vitest";
import { fileError, fileKind, MAX_FILE_BYTES } from "./files";

describe("fileError", () => {
  it("accepts common document and image types", () => {
    expect(fileError({ name: "a.pdf", size: 10, type: "application/pdf" })).toBeNull();
    expect(fileError({ name: "a.png", size: 10, type: "image/png" })).toBeNull();
    expect(fileError({ name: "a.docx", size: 10, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBeNull();
  });
  it("rejects too big, empty and unsupported", () => {
    expect(fileError({ name: "big.pdf", size: MAX_FILE_BYTES + 1, type: "application/pdf" })).toMatch(/50 МБ/);
    expect(fileError({ name: "e.txt", size: 0, type: "text/plain" })).toMatch(/пустой/);
    expect(fileError({ name: "x.exe", size: 10, type: "application/x-msdownload" })).toMatch(/не поддерживается/);
  });
});

describe("fileKind", () => {
  it("maps mime to kind", () => {
    expect(fileKind("image/jpeg")).toBe("image");
    expect(fileKind("application/pdf")).toBe("pdf");
    expect(fileKind("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("sheet");
    expect(fileKind("text/plain")).toBe("text");
  });
});
