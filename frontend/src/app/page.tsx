import Link from "next/link";

// Временная заглушка: лендинг собирается отдельной секцией мастера.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="font-display text-5xl font-extralight tracking-[0.4em]">
        KUR<span className="text-acc">A</span>I
      </h1>
      <Link href="/kit" className="font-mono text-xs tracking-[0.12em] text-ink3 uppercase hover:text-acc">
        › дизайн-система / kit
      </Link>
    </main>
  );
}
