// src/components/ui/bottom-sheet.tsx
"use client"

import * as React from "react"
import * as Sheet from "vaul"
import { cn } from "@/lib/utils"

type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  title?: string
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  className,
  title,
}: BottomSheetProps) {
  return (
    <Sheet.Root open={open} onOpenChange={onOpenChange} modal={true}>
      <Sheet.Portal>
        <Sheet.Overlay className="fixed inset-0 bg-black/40" />
        <Sheet.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-white shadow-lg",
            "h-[85vh] sm:max-w-md sm:mx-auto",
            className
          )}
        >
          {/* Handle bar */}
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-300" />

          {/* Title (optional) */}
          {title && (
            <div className="text-center font-medium py-2 border-b">
              {title}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
