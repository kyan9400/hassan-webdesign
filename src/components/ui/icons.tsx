import type { SVGProps } from "react";

/**
 * Botanical line icons, drawn in code. 24px, stroke 1.75, currentColor.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Small sprout glyph used before eyebrows and on dividers. */
export function Sprout({ size = 10, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" focusable="false" {...rest}>
      <path d="M5 9.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M5 5.6C5 3.4 3.4 2 1 2c0 2.3 1.6 3.6 4 3.6Z" fill="currentColor" />
      <path d="M5 4.6C5 2.4 6.4.6 9 .6c0 2.4-1.6 4-4 4Z" fill="currentColor" opacity=".7" />
    </svg>
  );
}

/** Landing pages: one leaf on a stem. */
export function IconLeafStem(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 21V11" />
      <path d="M12 12c0-4.4 3-7.5 8-8 0 5-3.4 8-8 8Z" />
      <path d="M12 12c1.6-1.8 3.2-3.2 5.2-4.6" />
    </Base>
  );
}

/** Business websites: a branching plant with four leaves. */
export function IconBranching(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 21V6" />
      <path d="M12 14c-1.2-2.6-3.6-3.9-7-3.6.4 3.1 3.1 4.4 7 3.6Z" />
      <path d="M12 11c1.2-2.6 3.6-3.9 7-3.6-.4 3.1-3.1 4.4-7 3.6Z" />
      <path d="M12 17.5c1-2 3-3 5.6-2.7-.3 2.4-2.5 3.4-5.6 2.7Z" />
      <path d="M12 7c-.8-1.9-2.5-2.9-4.8-2.7.3 2.2 2 3.1 4.8 2.7Z" />
    </Base>
  );
}

/** 3D & interactive: a glass cloche over a sprout (the glasshouse motif). */
export function IconCloche(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 19h16" />
      <path d="M5.5 19v-6a6.5 6.5 0 0 1 13 0v6" />
      <path d="M12 4.2V6.5" />
      <path d="M12 19v-4.5" />
      <path d="M12 15.2c0-1.8-1.3-3-3.2-3 0 1.9 1.3 3 3.2 3Z" />
      <path d="M12 14.6c0-1.8 1.3-3 3.2-3 0 1.9-1.3 3-3.2 3Z" />
      <path d="M8.2 10.5c.6-1.2 1.6-2 2.8-2.3" opacity=".6" />
    </Base>
  );
}

/** AI tools: a seed whose roots branch like a decision tree. */
export function IconSeedRoots(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5c2.2 1.2 3.2 3 3.2 4.6A3.2 3.2 0 0 1 12 11.3a3.2 3.2 0 0 1-3.2-3.2c0-1.6 1-3.4 3.2-4.6Z" />
      <path d="M12 11.3V14" />
      <path d="M12 14l-4 3v3" />
      <path d="M12 14l4 3v3" />
      <path d="M8 17l-2.5 2.5" />
      <path d="M16 17l2.5 2.5" />
      <circle cx="8" cy="20.2" r=".6" fill="currentColor" />
      <circle cx="16" cy="20.2" r=".6" fill="currentColor" />
    </Base>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Base>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Base>
  );
}

/** Motion: a hummingbird wing arc. */
export function IconMotion(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 15c3.5 0 6-2.2 7.5-6.5" />
      <path d="M4 19c5 0 9-3 11-9" opacity=".6" />
      <path d="M13 6.5c1.6-1.9 3.6-2.8 6-2.5-.5 2.5-2 4.2-4.4 5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
    </Base>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </Base>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Base>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 16 16.5 7.5" />
      <path d="M9 7h8v8" />
    </Base>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 8h16M4 16h16" />
    </Base>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </Base>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Base>
  );
}
