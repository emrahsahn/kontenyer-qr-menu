"use client"

import React, { useState } from "react"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import {
  Printer,
  Download,
  Settings2,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit3
} from "lucide-react"

interface TableQrCardPrinterProps {
  baseMenuUrl: string
}

export function TableQrCardPrinter({ baseMenuUrl }: TableQrCardPrinterProps) {
  // Config state
  const [tableCount, setTableCount] = useState<number>(10)
  const [startNumber, setStartNumber] = useState<number>(1)
  const [prefix, setPrefix] = useState<string>("M-")
  const [isCustomPrefix, setIsCustomPrefix] = useState<boolean>(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(0)
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Generate table list (All point strictly to the common menu URL)
  const tables = Array.from({ length: Math.max(1, Math.min(tableCount, 100)) }, (_, i) => {
    const num = startNumber + i
    const formattedNum = num < 10 ? `0${num}` : `${num}`
    const label = `${prefix}${formattedNum}`
    const url = baseMenuUrl.includes("?") ? `${baseMenuUrl}&qr=konteyner` : `${baseMenuUrl}?qr=konteyner`
    return { num, formattedNum, label, url }
  })

  // Selected table for single preview
  const currentTable = tables[Math.min(currentPreviewIndex, tables.length - 1)] || tables[0]

  // Print function using browser print window
  const handlePrint = () => {
    window.print()
  }

  // Download high-resolution PNG of a single card using Canvas (7.5x10 cm @ 300 DPI)
  const downloadSingleCardPng = async (tableItem: typeof currentTable) => {
    try {
      setIsExporting(true)
      const canvas = document.createElement("canvas")
      // 75mm x 100mm at 300 DPI (approx 886 x 1181 px)
      const width = 886
      const height = 1181
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // 1. Background White
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, width, height)

      // 2. Load and draw Logo (Top)
      const logoImg = new window.Image()
      logoImg.crossOrigin = "anonymous"
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
        logoImg.src = "/logo-black.png"
      })

      if (logoImg.width > 0) {
        const logoHeight = 220
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight
        const logoX = (width - logoWidth) / 2

        // Draw monochrome solid black logo for maximum print contrast
        const offCanvas = document.createElement("canvas")
        offCanvas.width = logoWidth
        offCanvas.height = logoHeight
        const offCtx = offCanvas.getContext("2d")
        if (offCtx) {
          offCtx.drawImage(logoImg, 0, 0, logoWidth, logoHeight)
          offCtx.globalCompositeOperation = "source-in"
          offCtx.fillStyle = "#000000"
          offCtx.fillRect(0, 0, logoWidth, logoHeight)
          ctx.drawImage(offCanvas, logoX, 50)
        } else {
          ctx.drawImage(logoImg, logoX, 50, logoWidth, logoHeight)
        }
      }

      // 3. Generate QR Code image (5x5 cm -> 590x590 px)
      const qrSvgElement = document.getElementById(`qr-svg-${tableItem.num}`)
      if (qrSvgElement) {
        const svgData = new XMLSerializer().serializeToString(qrSvgElement)
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const URL = window.URL || window.webkitURL || window
        const blobURL = URL.createObjectURL(svgBlob)

        const qrImg = new window.Image()
        await new Promise((resolve) => {
          qrImg.onload = resolve
          qrImg.onerror = resolve
          qrImg.src = blobURL
        })

        // QR is 50mm x 50mm -> 590 x 590 px @ 300 DPI
        const qrSize = 590
        const qrX = (width - qrSize) / 2
        const qrY = 320
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
        URL.revokeObjectURL(blobURL)
      }

      // 4. Draw Table Number (Bottom) e.g. "M-01"
      ctx.fillStyle = "#000000"
      ctx.font = "900 130px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(tableItem.label, width / 2, 1030)

      // 5. Download image
      const dataUrl = canvas.toDataURL("image/png", 1.0)
      const link = document.createElement("a")
      link.download = `Konteyner-Masa-Karti-${tableItem.label}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error("Single card PNG export failed:", e)
    } finally {
      setIsExporting(false)
    }
  }

  // Download all cards sequentially
  const downloadAllCardsPng = async () => {
    setIsExporting(true)
    for (const table of tables) {
      await downloadSingleCardPng(table)
      // Small pause between downloads to prevent browser blocking
      await new Promise((r) => setTimeout(r, 250))
    }
    setIsExporting(false)
  }

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-8 min-w-0 max-w-full">
      {/* Configuration Controls Bar */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
            <Settings2 className="h-4 w-4 shrink-0" />
            7.5 × 10 CM MASA BASKI ŞABLONU
          </div>
          <h3 className="font-heading font-black text-lg sm:text-xl text-foreground">
            Cafe Masa Kartı &amp; QR Üretici
          </h3>
          <p className="text-xs text-foreground/60">
            Tüm masalar ortak dijital menüyü açar. Kartlar 7.5 × 10 cm ve QR 5 × 5 cm ebadındadır.
          </p>
        </div>

        {/* Mobile-Friendly Configuration Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 w-full md:w-auto">
          {/* 1. Masa Ön Eki */}
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-foreground/60 tracking-wider">
                Masa Ön Eki
              </label>
              <button
                type="button"
                onClick={() => setIsCustomPrefix(!isCustomPrefix)}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="h-2.5 w-2.5" />
                <span>{isCustomPrefix ? "Seçenekler" : "Özel Yaz"}</span>
              </button>
            </div>
            {isCustomPrefix ? (
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Örn: M-"
                className="w-full sm:w-28 h-10 sm:h-9 px-3 rounded-xl bg-secondary border border-border text-xs font-black text-foreground text-center focus:outline-none focus:border-primary"
              />
            ) : (
              <div className="relative">
                <select
                  value={prefix}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomPrefix(true)
                    } else {
                      setPrefix(e.target.value)
                    }
                  }}
                  className="w-full sm:w-28 h-10 sm:h-9 px-3 pr-8 rounded-xl bg-secondary border border-border text-xs font-black text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="M-">M- (M-01)</option>
                  <option value="MASA-">MASA-</option>
                  <option value="B-">B- (Bahçe)</option>
                  <option value="T-">T- (Teras)</option>
                  <option value="K-">K- (Konteyner)</option>
                  <option value="V-">V- (VIP)</option>
                  <option value="">(Ön Eksiz)</option>
                  <option value="__custom__">✏️ Özel Yaz...</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/50 pointer-events-none" />
              </div>
            )}
          </div>

          {/* 2. Başlangıç No */}
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-black uppercase text-foreground/60 tracking-wider">
              Başlangıç No
            </label>
            <div className="relative">
              <select
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                className="w-full sm:w-24 h-10 sm:h-9 px-3 pr-8 rounded-xl bg-secondary border border-border text-xs font-black text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25, 30, 40, 50, 75, 100].map((num) => (
                  <option key={num} value={num}>
                    No: {num < 10 ? `0${num}` : num}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/50 pointer-events-none" />
            </div>
          </div>

          {/* 3. Masa Sayısı */}
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-black uppercase text-foreground/60 tracking-wider">
              Masa Sayısı
            </label>
            <div className="relative">
              <select
                value={tableCount}
                onChange={(e) => setTableCount(parseInt(e.target.value) || 10)}
                className="w-full sm:w-28 h-10 sm:h-9 px-3 pr-8 rounded-xl bg-secondary border border-border text-xs font-black text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100].map((count) => (
                  <option key={count} value={count}>
                    {count} Masa
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/50 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Preview and Actions Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left: 7.5cm x 10cm Card Mockup Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full max-w-[280px] px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Canlı Önizleme ({currentPreviewIndex + 1}/{tables.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPreviewIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentPreviewIndex === 0}
                className="p-1.5 rounded-lg bg-secondary hover:bg-muted text-foreground border border-border disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPreviewIndex((prev) => Math.min(tables.length - 1, prev + 1))}
                disabled={currentPreviewIndex === tables.length - 1}
                className="p-1.5 rounded-lg bg-secondary hover:bg-muted text-foreground border border-border disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* PHYSICAL 7.5cm x 10cm RATIO CARD SIMULATOR */}
          <div className="relative p-1 rounded-3xl bg-gradient-to-b from-border/80 to-border/30 shadow-2xl">
            <div
              className="w-[280px] h-[373px] bg-white text-black rounded-2xl shadow-xl flex flex-col items-center justify-between p-4 border border-black/10 relative overflow-hidden select-none"
              style={{
                aspectRatio: "75 / 100"
              }}
            >
              {/* Card Dimensions Label (Visual helper) */}
              <div className="absolute top-1.5 right-2 text-[8px] font-black text-black/30 tracking-widest uppercase">
                7.5 × 10 CM
              </div>

              {/* 1. Header Logo (Konteyner Coffee & Roastery - Solid Black for print) */}
              <div className="w-full flex flex-col items-center justify-center pt-2">
                <div className="relative w-36 h-14">
                  <Image
                    src="/logo-black.png"
                    alt="Konteyner Cafe"
                    fill
                    unoptimized
                    priority
                    className="object-contain"
                  />
                </div>
              </div>

              {/* 2. Middle: 5x5 cm QR Code */}
              <div className="p-1.5 bg-white rounded-xl border border-black/5 shadow-xs flex flex-col items-center">
                <QRCodeSVG
                  value={currentTable.url}
                  size={145}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* 3. Bottom: Table Number e.g. M-01 */}
              <div className="w-full text-center pb-2">
                <span className="font-sans font-black text-3xl sm:text-4xl text-black tracking-wider leading-none">
                  {currentTable.label}
                </span>
              </div>
            </div>
          </div>

          <span className="text-[11px] text-foreground/50 text-center font-medium">
            * 7.5 cm × 10 cm standart masa stantları ve pleksiler için uygundur.
          </span>
        </div>

        {/* Right: Batch Actions & Table Grid */}
        <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
          {/* Main Action Buttons */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border shadow-md flex flex-col gap-3 sm:gap-4">
            <h4 className="font-heading font-black text-base sm:text-lg text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Yazdırma &amp; İndirme Seçenekleri
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* 1. Print / Save to PDF (All Tables A4 layout) */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/25 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Tüm Masaları Yazdır (A4 / PDF)</span>
              </button>

              {/* 2. Download Selected Table PNG */}
              <button
                type="button"
                onClick={() => downloadSingleCardPng(currentTable)}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 text-primary shrink-0" />
                <span>Seçili Kartı İndir ({currentTable.label})</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-border">
              <span className="text-xs text-foreground/60 font-semibold">
                Toplam <strong>{tables.length}</strong> masa kartı hazırlandı ({tables[0]?.label} — {tables[tables.length - 1]?.label}).
              </span>
              <button
                type="button"
                onClick={downloadAllCardsPng}
                disabled={isExporting}
                className="text-xs font-black text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tümünü Tek Tek PNG İndir</span>
              </button>
            </div>
          </div>

          {/* Quick Table Switcher Grid */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                Tüm Masa Kartları ({tables.length} Adet)
              </span>
              <span className="text-[11px] text-foreground/50 font-medium">
                Önizlemek için masaya tıklayın
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
              {tables.map((table, idx) => (
                <button
                  key={table.num}
                  type="button"
                  onClick={() => setCurrentPreviewIndex(idx)}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    currentPreviewIndex === idx
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                      : "bg-secondary hover:bg-muted text-foreground border-border"
                  }`}
                >
                  {table.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HIDDEN PRINT CONTAINER (Rendered ONLY during window.print() on A4 paper) */}
      {/* ========================================================================= */}
      <div className="hidden print:block print:w-full print:bg-white print:text-black">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body * {
              visibility: hidden;
            }
            #yali-print-area, #yali-print-area * {
              visibility: visible;
            }
            #yali-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 190mm;
              display: grid !important;
              grid-template-columns: 75mm 75mm;
              gap: 15mm 15mm;
              justify-content: center;
              background: white !important;
            }
            .yali-card-page-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}} />

        <div id="yali-print-area">
          {tables.map((table) => (
            <div
              key={table.num}
              className="yali-card-page-break"
              style={{
                width: "75mm",
                height: "100mm",
                boxSizing: "border-box",
                border: "1px solid #E2E8F0",
                borderRadius: "3mm",
                padding: "5mm 4mm",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#FFFFFF",
                position: "relative"
              }}
            >
              {/* 1. Header Logo */}
              <div style={{ width: "100%", display: "flex", justifyContent: "center", height: "18mm" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-black.png"
                  alt="Konteyner Cafe & Roastery"
                  style={{ maxHeight: "18mm", maxWidth: "48mm", objectFit: "contain" }}
                />
              </div>

              {/* 2. Middle: Exact 50mm x 50mm QR Code (Common Menu URL) */}
              <div
                style={{
                  width: "50mm",
                  height: "50mm",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF"
                }}
              >
                <QRCodeSVG
                  id={`qr-svg-${table.num}`}
                  value={table.url}
                  size={188} // 50mm @ 96dpi ≈ 188px
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* 3. Bottom: Table Label e.g. M-01 */}
              <div style={{ width: "100%", textAlign: "center", height: "12mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontWeight: 900,
                    fontSize: "26pt",
                    color: "#000000",
                    letterSpacing: "1px",
                    lineHeight: 1
                  }}
                >
                  {table.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
