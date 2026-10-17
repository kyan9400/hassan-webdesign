import { ImageResponse } from "next/og";

// already static; the static export (GitHub Pages mirror) needs it said explicitly
export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The hummingbird mark (same as icon.svg) on paper. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F7F1" }}>
        <svg width="150" height="150" viewBox="0 0 64 64">
          <path d="M27 33c-6-9-4-19 4-23 6 4 6 13-1 22z" fill="#8FD3E8" />
          <path d="M18 40c-5 3-8 6-11 10 6-1 10-3 14-6z" fill="#2F7D4F" />
          <ellipse cx="29" cy="37" rx="13" ry="8" transform="rotate(-30 29 37)" fill="#2F7D4F" />
          <circle cx="39" cy="27" r="6" fill="#2F7D4F" />
          <circle cx="38" cy="33" r="3.2" fill="#F07A9A" />
          <path d="M44 25.5 58 23" stroke="#13221A" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
