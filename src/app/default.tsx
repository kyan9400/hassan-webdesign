import { notFound } from "next/navigation";

/** Unmatched URLs render the 404 page (the @modal slot's catch-all must not turn them into empty pages). */
export default function Default() {
  notFound();
}
