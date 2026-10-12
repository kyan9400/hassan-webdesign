/**
 * Section <h2> with the line reveal: the text sits in a clipping mask and rises into place the
 * first time the heading enters the viewport (CSS, full motion only; RevealObserver sets
 * data-revealed). Never used on the hero H1.
 */
export function SectionTitle({ id, children, className = "text-display-l" }: { id: string; children: string; className?: string }) {
  return (
    <h2 id={id} className={`section-title ${className}`} data-reveal-watch>
      <span className="line-mask">
        <span>{children}</span>
      </span>
    </h2>
  );
}
