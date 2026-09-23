import { describe, expect, it } from "vitest";
import { emailError, passwordError, passwordScore } from "./auth-validate";

describe("emailError", () => {
  it("accepts normal addresses", () => {
    expect(emailError("dmitry@kurai.ai")).toBeNull();
    expect(emailError("  Name.Surname@Yandex.RU ")).toBeNull();
  });
  it("rejects empty, malformed and disposable", () => {
    expect(emailError("")).toBe("Введите email");
    expect(emailError("dmitry@kurai")).toMatch(/опечатка/);
    expect(emailError("a@mailinator.com")).toMatch(/Одноразовые/);
    expect(emailError("a@eu.yopmail.com")).toMatch(/Одноразовые/);
  });
});

describe("passwordScore", () => {
  it("grows with length, case mix, digits and symbols", () => {
    expect(passwordScore("short")).toBe(0);
    expect(passwordScore("abcdefgh")).toBe(1);
    expect(passwordScore("abcdefghijkl")).toBe(2);
    expect(passwordScore("Abcdefghijkl")).toBe(3);
    expect(passwordScore("Abcdefghijk1!")).toBe(4);
  });
  it("passwordError requires 8+ chars", () => {
    expect(passwordError("")).toBe("Введите пароль");
    expect(passwordError("1234567")).toBe("Минимум 8 символов");
    expect(passwordError("12345678")).toBeNull();
  });
});
