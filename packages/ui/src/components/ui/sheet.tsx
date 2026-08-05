"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn(className)} {...props} />;
}

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/70" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 w-4/5 max-w-sm p-8 shadow-xl",
          side === "right" ? "right-0" : "left-0",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-5 top-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="Close"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
