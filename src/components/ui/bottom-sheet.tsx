import * as React from "react"
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

type BottomSheetProps = {
  children: React.ReactNode
  className?: string
  initialSnap?: "collapsed" | "half" | "full"
}

export function BottomSheet({
  children,
  className,
  initialSnap = "half",
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null)

  // Define snap points
  const snapPoints = {
    collapsed: 80,
    half: typeof window !== "undefined" ? window.innerHeight * 0.4 : 300,
    full: typeof window !== "undefined" ? window.innerHeight * 0.85 : 500,
  }

  const snapValues = Object.values(snapPoints)
  const y = useMotionValue(0)

  // Derived height (not strictly needed yet, but available if you want to animate height-based styles)
  const height = useTransform(y, (val) => window.innerHeight - val)

  React.useEffect(() => {
    // Set initial snap position
    y.set(window.innerHeight - snapPoints[initialSnap])
  }, [])

  const handleDragEnd = (_: any, info: any) => {
    const newY = y.get() + info.offset.y
    const closest = snapValues.reduce((prev, curr) =>
      Math.abs(window.innerHeight - curr - newY) < Math.abs(window.innerHeight - prev - newY)
        ? curr
        : prev
    )
    y.set(window.innerHeight - closest)
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        style={{ y }}
        onDragEnd={handleDragEnd}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-lg flex flex-col",
          className
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </motion.div>
    </AnimatePresence>
  )
}
