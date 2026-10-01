import { describe, expect, it } from "vitest";
import { emailError, loginPasswordError, passwordError, passwordScore } from "./auth-validate";

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
  it("passwordError mirrors the backend's 12-character minimum", () => {
    expect(passwordError("")).toBe("Введите пароль");
    expect(passwordError("12345678901")).toBe("Минимум 12 символов");
    expect(passwordError("123456789012")).toBeNull();
  });

  it("keeps login compatible with accounts created before the current sign-up minimum", () => {
    expect(loginPasswordError("")).toBe("Введите пароль");
    expect(loginPasswordError("eight888")).toBeNull();
  });
});
