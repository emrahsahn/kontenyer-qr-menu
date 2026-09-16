"use client"

import React from "react"
import { KonteynerLogo } from "@/components/ui/konteyner-logo"
import { QrCode, Sparkles, ShieldCheck, Camera, Smartphone } from "lucide-react"

export function QrLockScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative bg-black text-white selection:bg-white/20 overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <KonteynerLogo size="lg" shadow className="rounded-3xl border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.08)]" />

          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              SPECIALTY COFFEE &amp; ARTISAN BAKERY
            </span>
            <h1 className="font-black text-3xl sm:text-4xl text-white tracking-widest leading-none">
              KONTEYNER
            </h1>
            <span className="text-xs font-serif italic text-zinc-300 tracking-[0.25em] uppercase font-semibold">
              Cafe &amp; Roastery
            </span>
          </div>
        </div>

        {/* Lock Notice Card */}
        <div className="w-full bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-6">
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-white animate-pulse">
            <QrCode className="h-8 w-8" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              MASA DOĞRULAMASI GEREKLİDİR
            </h2>
            <p className="text-sm sm:text-base font-medium text-zinc-200 leading-relaxed">
              &ldquo;Değerli misafirimiz, menümüz sadece masalarımızdaki QR kod ile görüntülenebilmektedir.&rdquo;
            </p>
          </div>

          {/* How to open instructions */}
          <div className="w-full bg-black/50 p-4 rounded-2xl border border-white/10 flex flex-col gap-2.5 text-left text-xs text-zinc-300">
            <div className="flex items-center gap-2.5 text-white font-bold">
              <Camera className="h-4 w-4 text-white shrink-0" />
              <span>1. Telefonunuzun kamerasını açın</span>
            </div>
            <div className="flex items-center gap-2.5 text-white font-bold">
              <QrCode className="h-4 w-4 text-white shrink-0" />
              <span>2. Masanızdaki QR kodu okutun</span>
            </div>
            <div className="flex items-center gap-2.5 text-white font-bold">
              <Smartphone className="h-4 w-4 text-white shrink-0" />
              <span>3. Bildirimden menümüze göz atın</span>
            </div>
          </div>

          {/* 2-Hour Info Badge */}
          <div className="flex items-center gap-2 text-[11px] text-white font-semibold bg-white/10 px-3.5 py-2 rounded-xl border border-white/20">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Masanızdaki QR okutulduğunda 2 saatlik oturum açar.</span>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-[11px] text-white/40 font-medium tracking-wide">
          © {new Date().getFullYear()} Konteyner Cafe &amp; Roastery. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  )
}
