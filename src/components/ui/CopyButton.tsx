"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy } from "./icons";
import { toast } from "./Toast";

type Props = {
  /** text to copy; when omitted, the current page URL is copied */
  value?: string;
  label: string;
  copiedLabel: string;
  ariaLabel?: string;
  /** message for the toast / live region */
  toastMessage?: string;
  className?: string;
  labelClassName?: string;
  icon?: boolean;
};

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ value, label, copiedLabel, ariaLabel, toastMessage, className = "", labelClassName = "", icon = true }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function onClick() {
    const text = value ?? window.location.href;
    const ok = await writeClipboard(text);
    if (!ok) return;
    setCopied(true);
    toast(toastMessage ?? copiedLabel);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={className}>
      {icon ? copied ? <IconCheck size={18} /> : <IconCopy size={18} /> : null}
      <span className={labelClassName}>{copied ? copiedLabel : label}</span>
    </button>
  );
}
