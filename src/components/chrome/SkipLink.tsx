import { skipLink } from "@/data/site";

export function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      {skipLink}
    </a>
  );
}
