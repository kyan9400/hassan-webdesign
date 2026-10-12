"use client";

import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, FocusEvent, MouseEvent, PointerEvent } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  /** scroll to the top after navigating (false keeps the page put, e.g. for the project panel) */
  scroll?: boolean;
  replace?: boolean;
};

/**
 * A small client-side link: a real <a href> that navigates with the App Router on a plain
 * left click (so /work/{slug} opens in the intercepted panel), prefetches on hover / focus /
 * touch, and leaves new-tab clicks, other origins and same-page #hash jumps to the browser.
 * It replaces next/link on the home page to keep next/link's code out of the first-load bundle.
 */
export function RouteLink({ href, scroll = true, replace = false, onClick, onFocus, onPointerEnter, onPointerDown, ...rest }: Props) {
  const router = useRouter();
  const prefetch = () => {
    try {
      router.prefetch(href);
    } catch {
      /* prefetch is a hint only */
    }
  };
  return (
    <a
      {...rest}
      href={href}
      onPointerEnter={(e: PointerEvent<HTMLAnchorElement>) => {
        if (e.pointerType === "mouse") prefetch();
        onPointerEnter?.(e);
      }}
      onPointerDown={(e: PointerEvent<HTMLAnchorElement>) => {
        if (e.pointerType !== "mouse") prefetch();
        onPointerDown?.(e);
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        prefetch();
        onFocus?.(e);
      }}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (rest.target && rest.target !== "_self") return;
        let url: URL;
        try {
          url = new URL(href, window.location.href);
        } catch {
          return;
        }
        if (url.origin !== window.location.origin) return;
        // same page, only a #hash: the browser scrolls (and focuses) natively
        if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return;
        e.preventDefault();
        if (replace) router.replace(href, { scroll });
        else router.push(href, { scroll });
      }}
    />
  );
}
