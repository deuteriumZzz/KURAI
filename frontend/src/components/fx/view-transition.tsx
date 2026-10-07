import * as React from "react";

/** React <ViewTransition> из канала Next; на стабильном React (тесты) — просто дети без перехода. */
export const ViewTransition: typeof React.ViewTransition =
  React.ViewTransition ?? (({ children }: { children?: React.ReactNode }) => children);
