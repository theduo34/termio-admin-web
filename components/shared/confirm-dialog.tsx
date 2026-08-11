"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

import { Button, type buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  pendingLabel,
  confirmVariant = "destructive",
  dialogVariant = "responsive",
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  /** Shown on the confirm button while onConfirm's promise is in flight. */
  pendingLabel?: string
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"]
  /** "modal" keeps this a centered dialog even on mobile — see DialogContent. */
  dialogVariant?: "responsive" | "modal"
  onConfirm: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent variant={dialogVariant} showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={() => void handleConfirm()} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {pendingLabel ?? "Working..."}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
