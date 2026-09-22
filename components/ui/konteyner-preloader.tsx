"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { ArrowRight, Utensils } from "lucide-react"

interface KonteynerPreloaderProps {
  onComplete?: () => void
  forcePlay?: boolean
  tableName?: string
  tableNo?: number
}

function SteamSvg({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
    >
      <path className="curl" d="M30 210 C10 180 45 165 25 135 C8 108 42 92 28 62" />
      <path className="curl" d="M62 214 C42 186 76 168 56 138 C40 112 74 96 60 66" />
      <path className="curl" d="M94 208 C74 182 106 162 88 134 C72 108 104 90 92 60" />
    </svg>
  )
}

export function KonteynerPreloader({
  onComplete,
  forcePlay = false,
  tableName,
  tableNo
}: KonteynerPreloaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [seqKey, setSeqKey] = useState(1)

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSequence = useCallback(() => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
    setIsVisible(true)
    setIsFadingOut(false)
    setIsOpen(false)
    setSeqKey((prev) => prev + 1)

    // Open doors after 1.65s exactly matching the preloader prototype
    openTimerRef.current = setTimeout(() => {
      setIsOpen(true)
    }, 1650)
  }, [])

  useEffect(() => {
    let cancelled = false

    if (typeof window !== "undefined" && !forcePlay) {
      const alreadyShown = sessionStorage.getItem("konteyner_preloader_shown")
      if (alreadyShown) {
        Promise.resolve().then(() => {
          if (!cancelled) {
            setIsVisible(false)
            onCompleteRef.current?.()
          }
        })
        return () => {
          cancelled = true
        }
      }
    }

    Promise.resolve().then(() => {
      if (!cancelled) runSequence()
    })

    return () => {
      cancelled = true
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
    }
  }, [forcePlay, runSequence])

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
    }
  }, [])

  const handleEnterMenu = () => {
    setIsFadingOut(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("konteyner_preloader_shown", "true")
    }
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => {
      setIsVisible(false)
      setIsFadingOut(false)
      onCompleteRef.current?.()
    }, 500)
  }

  if (!isVisible) return null

  return (
    <div
      id="konteyner-preloader-container"
      key={seqKey}
      className={`fixed inset-0 z-50 overflow-hidden select-none pointer-events-auto bg-[#0A0A0A] transition-all duration-500 ${
        isFadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ perspective: "2400px" }}
    >
      <style jsx>{`
        /* Steam wisps */
        .steam {
          position: absolute;
          top: 50%;
          width: clamp(60px, 8vw, 110px);
          transform: translateY(-50%);
          opacity: 0;
          color: #F3EEE4;
          pointer-events: none;
        }
        .steam--left {
          left: clamp(14px, 5vw, 60px);
        }
        .steam--right {
          right: clamp(14px, 5vw, 60px);
          transform: translateY(-50%) scaleX(-1);
        }

        :global(.curl) {
          animation: rise 3.6s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
        :global(.curl:nth-child(2)) {
          animation-delay: 0.6s;
        }
        :global(.curl:nth-child(3)) {
          animation-delay: 1.2s;
        }

        /* 3D Split Doors (Leaves) */
        .leaf {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          background: #0A0A0A;
          transition: transform 1.15s cubic-bezier(0.76, 0, 0.24, 1);
          transform-style: preserve-3d;
          will-change: transform;
        }
        .leaf--left {
          left: 0;
          transform-origin: 0% 50%;
          box-shadow: 6px 0 30px rgba(0, 0, 0, 0.7);
        }
        .leaf--right {
          right: 0;
          transform-origin: 100% 50%;
          box-shadow: -6px 0 30px rgba(0, 0, 0, 0.7);
        }
        .door-open .leaf--left {
          transform: rotateY(-98deg);
        }
        .door-open .leaf--right {
          transform: rotateY(98deg);
        }

        .spine {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 1px;
          transform: translateX(-50%);
          background: linear-gradient(180deg, transparent, rgba(243, 238, 228, 0.2) 50%, transparent);
          transition: opacity 0.4s ease 0.3s;
          z-index: 2;
        }
        .door-open .spine {
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        /* Logo Stage on Closed Doors */
        .logo-stage {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          transition: opacity 0.6s ease 0.15s;
        }
        .door-open .logo-stage {
          opacity: 0;
          pointer-events: none;
        }

        .logo-glow {
          position: absolute;
          width: min(90vw, 460px);
          height: min(90vw, 460px);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%);
          opacity: 0;
          transform: scale(0.6);
          animation: glowIn 1.8s ease-out forwards 0.15s;
        }

        .logo-stage .steam {
          animation: petalIn 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards 1.05s, rise 3.6s ease-in-out infinite 2.15s;
        }
        .logo-stage .steam--right {
          animation-name: petalInR, rise;
        }

        .logo-clip {
          position: relative;
          width: min(55vw, 340px);
          opacity: 0;
          transform: scale(0.88);
          animation: settle 1.25s cubic-bezier(0.22, 1, 0.36, 1) forwards 0.25s;
        }

        /* Site Content Behind Doors */
        .site-stage {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #000000;
          z-index: 1;
        }

        .site-stage .steam {
          animation: driftIn 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards 2.0s;
        }
        .site-stage .steam--right {
          animation-name: driftInR;
        }

        .site-mark {
          text-align: center;
          opacity: 0;
          animation: fadeUp 1s ease forwards 2.2s;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Content Behind the Preloader Doors (Revealed upon opening) */}
      <div className="site-stage px-4 text-center">
        <div className="steam steam--left">
          <SteamSvg />
        </div>

        <div className="site-mark flex flex-col items-center w-full max-w-md mx-auto py-4">
          {/* Konteyner Brand Logo Badge */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mb-4 p-2.5 rounded-3xl bg-white border border-zinc-200 shadow-2xl flex items-center justify-center">
            <Image
              src="/logo-black.png"
              alt="Konteyner"
              fill
              unoptimized
              priority
              className="object-contain p-1.5"
            />
          </div>

          <strong className="block font-black text-white text-3xl sm:text-5xl md:text-6xl tracking-wider mb-2">
            Konteyner
          </strong>
          <span className="block font-serif italic text-zinc-300 uppercase text-xs sm:text-sm tracking-[0.3em] font-semibold mb-6">
            Cafe
          </span>

          {/* Table Welcome Hint */}
          {(tableName || tableNo) && (
            <div className="mb-6 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-wide">
              {tableName ? tableName : `Masa ${tableNo}`} &bull; Hoş Geldiniz
            </div>
          )}

          {/* Action Button: "Menüyü İncele" */}
          <div className="w-full max-w-[280px] sm:max-w-xs">
            <button
              type="button"
              onClick={handleEnterMenu}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Utensils className="h-4 w-4" />
              <span>Menüyü İncele</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>

        <div className="steam steam--right">
          <SteamSvg />
        </div>
      </div>

      {/* 3D Preloader Stage (Doors + Logo Stage) */}
      <div className={`w-full h-full relative z-10 ${isOpen ? "door-open pointer-events-none" : "pointer-events-auto"}`}>
        <div className="leaf leaf--left" />
        <div className="leaf leaf--right" />
        <div className="spine" />

        <div className="logo-stage">
          <div className="steam steam--left">
            <SteamSvg />
          </div>

          <div className="logo-glow" />

          <div className="logo-clip flex justify-center items-center">
            <Image
              src="/logo.png"
              alt="Konteyner Cafe"
              width={340}
              height={340}
              priority
              unoptimized
              className="w-full h-auto object-contain"
            />
          </div>

          <div className="steam steam--right">
            <SteamSvg />
          </div>
        </div>
      </div>
    </div>
  )
}
