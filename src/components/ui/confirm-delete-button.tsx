"use client"

import * as React from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface ConfirmDeleteButtonProps {
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "ghost" | "destructive" | "outline" | "default" | "secondary"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm"
  className?: string
  disabled?: boolean
  isPending?: boolean
  children?: React.ReactNode
  triggerAriaLabel?: string
}

export function ConfirmDeleteButton({
  onConfirm,
  title = "Confirm Deletion",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "ghost",
  size = "icon",
  className,
  disabled = false,
  isPending: externalPending = false,
  children,
  triggerAriaLabel = "Delete",
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [internalPending, setInternalPending] = React.useState(false)

  const isPending = externalPending || internalPending

  const handleConfirm = async () => {
    try {
      setInternalPending(true)
      await onConfirm()
      setOpen(false)
    } finally {
      setInternalPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={cn("cursor-pointer", className)}
            disabled={disabled || isPending}
            aria-label={triggerAriaLabel}
          />
        }
      >
        {children ?? <Trash2 className="h-4 w-4 text-destructive" />}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={isPending} />
            }
          >
            {cancelText}
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            className="cursor-pointer"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
