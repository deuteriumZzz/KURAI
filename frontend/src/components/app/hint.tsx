/** Бейдж клавиши для режима подсказок (Alt). Родитель должен быть `relative`. */
export function Hint({ k }: { k: string }) {
  return (
    <span aria-hidden="true" className="fx-hint">
      {k}
    </span>
  );
}
