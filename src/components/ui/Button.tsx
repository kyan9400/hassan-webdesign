import { RouteLink as Link } from "./RouteLink";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "text" | "accent";

export function btnClass(variant: ButtonVariant = "primary", size: "md" | "sm" = "md", extra = ""): string {
  return ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : "", extra].filter(Boolean).join(" ");
}

type ExternalProps = {
  href: string;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  className?: string;
  /** accessible name; must mention that it opens in a new tab */
  ariaLabel: string;
  children: ReactNode;
};

/** External link styled as a button: new tab, rel="noopener noreferrer", label mentions the new tab. */
export function ExternalButton({ href, variant = "primary", size = "md", className = "", ariaLabel, children }: ExternalProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} className={btnClass(variant, size, className)}>
      {children}
    </a>
  );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  className?: string;
};

export function LinkButton({ variant = "primary", size = "md", className = "", ...rest }: LinkButtonProps) {
  return <Link {...rest} className={btnClass(variant, size, className)} />;
}
