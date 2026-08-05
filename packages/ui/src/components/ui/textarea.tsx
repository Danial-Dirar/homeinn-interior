import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full border border-current/20 bg-transparent px-3 py-2 text-base placeholder:text-current/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
      {...props}
    />
  );
}
