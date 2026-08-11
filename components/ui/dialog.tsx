"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

// Responsive by breakpoint, not by JS viewport detection — a single component
// that's a centered modal at `lg` and up, and a bottom sheet below it, so every
// caller (Hierarchy's create/rename dialogs, ConfirmDialog, any future one) gets
// both for free. `max-lg:`/`lg:` pairs below always cover both states so neither
// bleeds into the other's breakpoint.
//
// `variant="modal"` opts a caller out of the mobile bottom-sheet treatment — for
// content where a stray downward swipe/scroll shouldn't read as "dismiss" (the
// sign-out confirmation is the current example): always a centered modal, on
// every breakpoint.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  variant = "responsive",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  variant?: "responsive" | "modal"
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 flex flex-col border border-border bg-popover text-popover-foreground shadow-xl outline-none transition-all duration-200",
          "data-starting-style:opacity-0 data-ending-style:opacity-0",
          variant === "modal"
            ? // Always a centered modal, mobile included.
              cn(
                "top-1/2 left-1/2 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md p-6 sm:p-8",
                "data-starting-style:scale-95 data-ending-style:scale-95"
              )
            : cn(
                // Mobile: bottom sheet — pinned to the bottom edge, rounded top
                // only, slides up on enter/down on exit.
                "inset-x-0 bottom-0 top-auto max-h-[85vh] w-full translate-y-0 rounded-t-md p-6 pb-8",
                "max-lg:data-starting-style:translate-y-full max-lg:data-ending-style:translate-y-full",
                // Desktop (lg+): centered modal — overrides every positioning value above.
                "lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:max-h-[85vh] lg:w-full lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-md lg:p-8",
                "lg:data-starting-style:scale-95 lg:data-ending-style:scale-95"
              ),
          className
        )}
        {...props}
      >
        {variant === "responsive" && (
          <div className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-muted lg:hidden" aria-hidden />
        )}
        <div className="overflow-y-auto">{children}</div>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <X />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-6", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 [&>*]:w-full lg:flex-row lg:justify-end lg:[&>*]:w-auto",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
