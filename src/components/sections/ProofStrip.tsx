import type { CSSProperties } from "react";
import { proof } from "@/data/site";

export function ProofStrip() {
  return (
    <section aria-label={proof.label} className="border-y border-line bg-surface">
      <ul className="proof-grid container-site grid grid-cols-2 md:grid-cols-4">
        {proof.items.map((item, i) => (
          <li
            key={item.numeral}
            data-reveal
            style={{ "--reveal-i": i } as CSSProperties}
            className={[
              "flex flex-col gap-3 py-8 md:py-10",
              "px-4 first:pl-0 md:px-8",
              i % 2 === 1 ? "border-l" : "",
              i >= 2 ? "border-t md:border-t-0" : "",
              i === 2 ? "pl-0 md:border-l md:pl-8" : "",
            ].join(" ")}
          >
            <span className="text-numeral text-leaf">{item.numeral}</span>
            <span className="max-w-[26ch] text-small text-ink-soft">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
