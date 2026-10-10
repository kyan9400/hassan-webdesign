"use client";

import { useEffect } from "react";
import { markVisited } from "@/lib/gallery-store";

/** Records that a project was opened (sessionStorage["hw:visited"]) — feeds the explored counter and the vine. */
export function MarkVisited({ slug }: { slug: string }) {
  useEffect(() => {
    markVisited(slug);
  }, [slug]);
  return null;
}
