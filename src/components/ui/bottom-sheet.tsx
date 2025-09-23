// src/components/ui/bottom-sheet.tsx

"use client"

import * as React from "react"
import * as Sheet from "vaul"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  title?: string
  // New prop to expose the sheet's height
  onHeightChange?: (height: number) => void
  // New prop to specify snap points (e.g., ['25%', '50%', '85%'])
  snapPoints?: (number | string)[]
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  className,
  title,
  onHeightChange,
  // Default to the recommended snap points
  snapPoints = ['25%', '50%', '85%'],
}: BottomSheetProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!onHeightChange || !contentRef.current) return;

    // Use a ResizeObserver to get the sheet's height dynamically
    const observer = new ResizeObserver((entries) => {
      const contentEntry = entries[0];
      if (contentEntry) {
        onHeightChange(contentEntry.contentRect.height);
      }
    });

    observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <Sheet.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      snapPoints={snapPoints}
    >
      <Sheet.Portal>
        <Sheet.Content
          ref={contentRef}
          className={cn(
            // Use 'inset-x-0' instead of 'left-0 right-0' for cleaner code
            "fixed bottom-0 inset-x-0 z-50 flex flex-col rounded-t-2xl bg-white shadow-lg",
            "sm:max-w-md sm:mx-auto",
            className
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-300" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            {title && <div className="font-medium text-lg truncate">{title}</div>}
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet.Root>
  )
}