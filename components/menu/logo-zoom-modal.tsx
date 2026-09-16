"use client"

import React from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface LogoZoomModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LogoZoomModal({ isOpen, onClose }: LogoZoomModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-auto max-w-none p-0 bg-transparent border-none ring-0 shadow-none overflow-visible flex flex-col items-center justify-center outline-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Konteyner Coffee & Roastery Logo</DialogTitle>
        </DialogHeader>

        {/* Pure Circular Zoom View Container */}
        <div
          onClick={onClose}
          className="relative flex flex-col items-center justify-center cursor-pointer select-none group"
        >
          {/* Ambient Glowing Halo */}
          <div className="absolute top-12 -inset-3 rounded-full bg-foreground/15 blur-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Perfectly Circular Large Logo */}
          <div className="relative flex items-center justify-center w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-white border-4 border-zinc-200 shadow-2xl overflow-hidden transition-transform duration-300 hover:scale-105 p-6">
            <Image
              src="/logo-black.png"
              alt="Konteyner Cafe & Roastery Logo"
              width={240}
              height={240}
              priority
              unoptimized
              className="w-full h-full object-contain drop-shadow-sm select-none pointer-events-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
