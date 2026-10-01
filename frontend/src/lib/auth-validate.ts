/** Проверки форм входа и регистрации. На бэкенде — те же правила (дублируем, не доверяем клиенту). */

const DISPOSABLE = ["mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com", "guerrillamail.com", "yopmail.com", "trashmail.com", "getnada.com"];

export function emailError(email: string): string | null {
  const v = email.trim().toLowerCase();
  if (!v) return "Введите email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Проверьте адрес — похоже, в нём опечатка";
  const domain = v.split("@")[1] ?? "";
  if (DISPOSABLE.some((d) => domain === d || domain.endsWith(`.${d}`))) return "Одноразовые адреса не подходят — укажите постоянную почту";
  return null;
}

/** 0–4: длина ≥ 8, ≥ 12, разные регистры, цифры или символы. */
export function passwordScore(pw: string): number {
  if (pw.length < 8) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[a-zа-я]/.test(pw) && /[A-ZА-Я]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^\p{L}\d]/u.test(pw)) s++;
  return s;
}

export function passwordError(pw: string): string | null {
  if (!pw) return "Введите пароль";
  if (pw.length < 12) return "Минимум 12 символов";
  return null;
}

/** Existing accounts may predate the current sign-up rule; login only needs a password. */
export function loginPasswordError(pw: string): string | null {
  return pw ? null : "Введите пароль";
}

export const SCORE_LABEL = ["слишком короткий", "слабый", "нормальный", "хороший", "надёжный"] as const;
