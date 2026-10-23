/** BookLeaf wordmark: a folded leaf (a page) beside the name. */
export function Wordmark({ portal }: { portal?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <path d="M4 2h10l4 4v14H4z" fill="var(--color-cloth)" />
        <path d="M14 2v4h4" fill="var(--color-cloth-soft)" />
        <path d="M7 10h8M7 13h8M7 16h5" stroke="white" strokeWidth="1.3" />
      </svg>
      <span className="font-serif text-[19px] font-semibold tracking-tight text-ink">BookLeaf</span>
      {portal && <span className="text-sm text-ink-faint">{portal}</span>}
    </span>
  );
}
