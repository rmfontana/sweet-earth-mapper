import * as React from "react"
import { motion, useMotionValue, animate } from "framer-motion"
import { cn } from "@/lib/utils"

type BottomSheetProps = {
  children: React.ReactNode
  className?: string
  initialSnap?: "collapsed" | "half" | "full"
}

export function BottomSheet({
  children,
  className,
  initialSnap = "collapsed",
}: BottomSheetProps) {
  const snapPoints = React.useMemo(
    () => ({
      collapsed: 100,
      half: typeof window !== "undefined" ? window.innerHeight * 0.4 : 300,
      full: typeof window !== "undefined" ? window.innerHeight * 0.85 : 500,
    }),
    []
  )

  const snapValues = Object.values(snapPoints)
  const y = useMotionValue(0)

  React.useEffect(() => {
    y.set(window.innerHeight - snapPoints[initialSnap])
  }, [])

  const snapTo = (snap: number) => {
    animate(y, window.innerHeight - snap, {
      type: "spring",
      stiffness: 300,
      damping: 35,
    })
  }

  const handleDragEnd = (_: any, info: any) => {
    const current = y.get()
    const newY = current + info.offset.y
    const velocity = info.velocity.y

    // If swiping fast, go to next snap in direction
    if (velocity < -500) {
      // swipe up
      const higher = snapValues.filter((p) => window.innerHeight - p < current)
      if (higher.length) return snapTo(Math.max(...higher))
    } else if (velocity > 500) {
      // swipe down
      const lower = snapValues.filter((p) => window.innerHeight - p > current)
      if (lower.length) return snapTo(Math.min(...lower))
    }

    // Otherwise, go to closest snap
    const closest = snapValues.reduce((prev, curr) =>
      Math.abs(window.innerHeight - curr - newY) <
      Math.abs(window.innerHeight - prev - newY)
        ? curr
        : prev
    )
    snapTo(closest)
  }

  return (
    <motion.div
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
      {/* Handle bar with fallback button */}
      <div
        className="flex justify-center items-center py-2 cursor-grab active:cursor-grabbing"
        onClick={() => snapTo(snapPoints.half)}
      >
        <div className="h-1.5 w-12 rounded-full bg-gray-300" />
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </motion.div>
  )
}
