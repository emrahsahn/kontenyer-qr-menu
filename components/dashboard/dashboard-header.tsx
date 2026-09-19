"use client"

import React from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/context/auth-context"
import { Button } from "@/components/ui/button"
import { Globe, Sun, Moon, Menu, ExternalLink, LogOut } from "lucide-react"
import { KonteynerLogo } from "@/components/ui/konteyner-logo"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardHeader({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { logout } = useAuth()

  const handleSetLang = (newLang: "tr" | "en") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("konteyner_lang", newLang)
      window.dispatchEvent(new Event("konteyner_lang_change"))
      window.dispatchEvent(new Event("storage"))
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 min-w-0 max-w-full">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Menu Trigger */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground/80 hover:text-foreground border border-border cursor-pointer transition-all shrink-0"
          title="Menüyü Aç"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:flex shrink-0">
            <KonteynerLogo size="xs" shadow />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-heading font-black text-sm sm:text-base tracking-wide text-foreground truncate">
                KONTEYNER
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0">
                CAFE GÖREVLİSİ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Utility Buttons */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Customer Menu Preview Link */}
        <Link
          href="/menu"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold text-foreground transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5 text-primary" />
          <span>Menüyü Önizle</span>
        </Link>

        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8.5 w-8.5 rounded-xl border border-border hover:bg-primary/10 cursor-pointer" />}>
            <Globe className="h-3.5 w-3.5 text-foreground/80" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card text-foreground border border-border shadow-xl rounded-2xl">
            <DropdownMenuItem onClick={() => handleSetLang('tr')} className="cursor-pointer font-semibold text-xs">
              🇹🇷 Türkçe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetLang('en')} className="cursor-pointer font-semibold text-xs">
              🇬🇧 English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="h-8.5 w-8.5 rounded-xl border border-border hover:bg-primary/10 cursor-pointer"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" />
          <span className="sr-only">Tema Değiştir</span>
        </Button>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive text-xs font-bold transition-all cursor-pointer ml-1"
          title="Çıkış Yap"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
    </header>
  )
}
