import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full border border-current/20 bg-transparent px-3 text-base placeholder:text-current/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
      {...props}
    />
  );
}
