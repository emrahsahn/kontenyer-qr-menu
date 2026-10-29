"use client"

import React from "react"

// =========================================================================
// ✏️ GELİŞTİRİCİ İLETİŞİM BİLGİLERİNİZİ BU ALANDAN DÜZENLEYEBİLİRSİNİZ:
// =========================================================================
export const DEVELOPER_CONFIG = {
  // Kısa Hizmet / Unvan Tanımı (1. Satır)
  title: "Yazılım & Tasarım",

  // Geliştirici İsmi (2. Satır)
  name: "Emrah SAHIN",

  // Web Sitesi Profil URL'niz (3. Satır)
  websiteUrl: "https://personal-website-emrah.vercel.app/tr",
  websiteLabel: "Web Sitesi",

  // Instagram Kullanıcı Adınız (@ olmadan - 3. Satır)
  instagramUsername: "shn__emrah"
}

// Minimal Web / Globe SVG Icon
function GlobeIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

// Minimal Instagram SVG Icon
function InstagramIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function DeveloperFooter() {
  const instagramUrl = `https://instagram.com/${DEVELOPER_CONFIG.instagramUsername}`

  return (
    <footer className="w-full max-w-lg mx-auto px-4 mt-8 mb-6 select-none">
      <div className="flex flex-col items-center justify-center gap-1 text-center pt-6 border-t border-border/40">
        {/* 1. Satır: Title / Unvan */}
        <p className="text-[11px] font-medium text-foreground/50 tracking-wide">
          {DEVELOPER_CONFIG.title}
        </p>

        {/* 2. Satır: İsim */}
        <p className="text-xs font-bold text-foreground/80 tracking-wide">
          {DEVELOPER_CONFIG.name}
        </p>

        {/* 3. Satır: Web Sitesi & Instagram Adresleri */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium text-foreground/60 pt-0.5">
          {/* Web Sitesi */}
          <a
            href={DEVELOPER_CONFIG.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <GlobeIcon className="h-3 w-3 opacity-80" />
            <span>{DEVELOPER_CONFIG.websiteLabel}</span>
          </a>

          <span className="text-foreground/25">•</span>

          {/* Instagram */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <InstagramIcon className="h-3 w-3 opacity-75" />
            <span>@{DEVELOPER_CONFIG.instagramUsername}</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
