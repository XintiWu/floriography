"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

type CommonProps = {
  className?: string;
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

const base =
  "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<NonNullable<CommonProps["variant"]>, string> = {
  primary:
    "bg-[color:var(--ink)] text-[color:var(--paper)] hover:bg-black/85",
  ghost: "hover:bg-black/5 dark:hover:bg-white/10",
  outline:
    "border border-[color:var(--line)] hover:bg-black/5 dark:hover:bg-white/10",
};

const sizes: Record<NonNullable<CommonProps["size"]>, string> = {
  sm: "h-10 px-4 text-[13px] font-semibold tracking-wide",
  md: "h-11 px-5 text-sm font-semibold tracking-wide",
  lg: "h-12 px-6 text-sm font-semibold tracking-wide",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: CommonProps &
  (
    | (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
    | ({ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
  )) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in props && typeof props.href === "string") {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {props.children}
      </Link>
    );
  }

  return <button className={classes} {...props} />;
}

