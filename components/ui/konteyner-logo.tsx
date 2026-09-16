"use client"

import React from "react"
import Image from "next/image"

type KonteynerLogoSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_STYLES: Record<KonteynerLogoSize, { box: string; image: number }> = {
  xs: { box: "w-7 h-7 p-0.5 rounded-lg border", image: 24 },
  sm: { box: "w-8 h-8 p-1 rounded-xl border", image: 28 },
  md: { box: "w-12 h-12 p-1.5 rounded-2xl border", image: 40 },
  lg: { box: "w-16 h-16 p-2 rounded-2xl border", image: 56 },
  xl: { box: "w-24 h-24 p-2.5 rounded-3xl border", image: 84 }
}

interface KonteynerLogoProps {
  size?: KonteynerLogoSize
  className?: string
  shadow?: boolean
}

export function KonteynerLogo({ size = "md", className = "", shadow = false }: KonteynerLogoProps) {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.md

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 bg-white border border-zinc-200 dark:border-zinc-700 overflow-hidden ${
        styles.box
      } ${shadow ? "shadow-sm shadow-black/15" : "shadow-xs"} ${className}`}
    >
      <Image
        src="/logo-black.png"
        alt="Konteyner Cafe & Roastery"
        width={styles.image}
        height={styles.image}
        unoptimized
        priority
        className="w-full h-full object-contain"
      />
    </span>
  )
}
