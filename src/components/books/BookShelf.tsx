import type { BookDto } from "@/shared/dto";

// Bookcloth colours for spines. Red is deliberately absent — it's reserved for urgency.
const CLOTH = ["#2c3e8f", "#2f5d50", "#4b5a6b", "#7a5b1f", "#5b3a5e", "#245f6e", "#3d4a2a"];

function clothFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CLOTH[h % CLOTH.length];
}

/**
 * The author's books as spines on a shelf. Published books are bound in cloth;
 * books still in production are drawn as dashed, unbound outlines. Each spine links
 * to that book's details further down the page.
 */
export function BookShelf({ books }: { books: BookDto[] }) {
  return (
    <nav aria-label="Your books" className="overflow-x-auto pb-1">
      <ul className="flex min-w-max items-end gap-2 border-b-2 border-ink px-2">
        {books.map((b, i) => (
          <li key={b.id}>
            <a
              href={`#${b.id}`}
              title={`${b.title}${b.published ? "" : ` (in production: ${b.stage})`}`}
              className={`group flex flex-col items-center justify-between rounded-t-sm px-2 pt-3 pb-2 transition-transform hover:-translate-y-1 ${
                b.published ? "text-white" : "border-2 border-b-0 border-dashed border-rule-strong text-ink-soft"
              }`}
              style={{
                width: 52 + (b.title.length % 3) * 6,
                height: 188 + ((i * 37) % 3) * 14,
                background: b.published ? clothFor(b.id) : "transparent",
              }}
            >
              <span
                className="line-clamp-2 font-serif text-[15px] leading-tight font-medium [writing-mode:vertical-rl] rotate-180"
              >
                {b.title}
              </span>
              <span className={`mt-2 text-[10px] ${b.published ? "text-white/70" : "text-ink-faint"}`}>
                {b.published ? b.publicationDate?.slice(0, 4) : ""}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
