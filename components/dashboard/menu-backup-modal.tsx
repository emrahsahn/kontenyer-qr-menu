"use client"

import React, { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MenuBackupData } from "@/lib/data/menu-store"
import { Category, Product } from "@/lib/types/database"
import {
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  X,
  Database,
  FileCheck2,
  ShieldCheck
} from "lucide-react"

interface MenuBackupModalProps {
  isOpen: boolean
  onClose: () => void
  totalCategories: number
  totalProducts: number
  categories?: Category[]
  products?: Product[]
  onImportSuccess: () => Promise<void>
}

export function MenuBackupModal({
  isOpen,
  onClose,
  totalCategories,
  totalProducts,
  categories,
  products,
  onImportSuccess
}: MenuBackupModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export")

  // Export states
  const [isExporting, setIsExporting] = useState(false)
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false)

  // Import states
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<MenuBackupData | Record<string, unknown> | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [dryRunResult, setDryRunResult] = useState<{
    valid: boolean
    categoryCount?: number
    productCount?: number
    errors?: string[]
    warnings?: string[]
    message?: string
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace")
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper to safely extract auth headers from localStorage
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("konteyner_user") || localStorage.getItem("yali_user")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.token) {
            headers["Authorization"] = `Bearer ${parsed.token}`
          }
        }
      } catch {}
    }
    return headers
  }

  // Infallible file downloader that guarantees exact filename with .json extension across all browsers
  const triggerDownload = (content: string | object, filename: string) => {
    const jsonString = typeof content === "string" ? content : JSON.stringify(content, null, 2)

    // Strategy 1: Data URI encoding with explicit MIME and filename
    // Data URIs do not have a blob UUID path, so Chromium CANNOT fallback to a random UUID!
    try {
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(jsonString)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = dataUri
      a.download = filename
      a.setAttribute("download", filename)
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        if (a.parentNode) {
          a.parentNode.removeChild(a)
        }
      }, 1500)
      return
    } catch {
      // Strategy 2: Blob fallback if data URI is too large
    }

    try {
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = filename
      a.setAttribute("download", filename)
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (a.parentNode) {
          a.parentNode.removeChild(a)
        }
      }, 10000)
    } catch (err) {
      console.error("Download error:", err)
    }
  }

  // 1. Handle Export (Tries Server API first, falls back to client memory so it NEVER fails)
  const handleExport = async () => {
    try {
      setIsExporting(true)
      const dateStr = new Date().toISOString().split("T")[0]
      const filename = `kontenyer_menu_backup_${dateStr}.json`

      // 1. Try server API with credentials and bearer auth
      try {
        const res = await fetch("/api/menu/backup", {
          credentials: "include",
          headers: getAuthHeaders()
        })
        if (res.ok) {
          const text = await res.text()
          const parsed = JSON.parse(text)
          if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.products)) {
            triggerDownload(text, filename)
            return
          }
        }
      } catch (e) {
        console.warn("API export failed, using client data fallback:", e)
      }

      // 2. Client-side infallible fallback: Export live categories and products
      const fallbackBackup: MenuBackupData = {
        version: "1.0",
        system: "kontenyer-cafe-menu",
        exported_at: new Date().toISOString(),
        categories: categories || [],
        products: products || []
      }

      triggerDownload(fallbackBackup, filename)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Yedek indirilirken bir hata oluştu."
      alert(errorMsg)
    } finally {
      setIsExporting(false)
    }
  }

  // 2. Handle Template Download
  const handleDownloadTemplate = async () => {
    try {
      setIsTemplateDownloading(true)
      const filename = "kontenyer_menu_sablon.json"

      // 1. Try server API
      try {
        const res = await fetch("/api/menu/template", {
          credentials: "include",
          headers: getAuthHeaders()
        })
        if (res.ok) {
          const text = await res.text()
          const parsed = JSON.parse(text)
          if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.products)) {
            triggerDownload(text, filename)
            return
          }
        }
      } catch (e) {
        console.warn("API template failed, using client fallback:", e)
      }

      // 2. Client-side infallible template fallback
      const templateData: MenuBackupData = {
        version: "1.0",
        system: "kontenyer-cafe-menu",
        exported_at: new Date().toISOString(),
        categories: [
          { id: "cat-kahveler", ad_tr: "Sıcak & Soğuk Kahveler", ad_en: "Hot & Iced Coffees", sira: 1, created_at: new Date().toISOString() },
          { id: "cat-tatlilar", ad_tr: "Fırından & Tatlılar", ad_en: "Bakery & Desserts", sira: 2, created_at: new Date().toISOString() }
        ],
        products: [
          {
            id: "prod-ornek-espresso",
            kategori_id: "cat-kahveler",
            ad_tr: "Espresso",
            ad_en: "Espresso",
            aciklama_tr: "Kendi kavurduğumuz %100 Arabica çekirdeklerden yoğun ve zengin gövdeli espresso.",
            aciklama_en: "Rich and full-bodied espresso roasted in-house from 100% Arabica beans.",
            fiyat: 110,
            porsiyonlar: [
              { id: "p-single", ad_tr: "Tek Shot (Single)", ad_en: "Single Shot", fiyat: 110 },
              { id: "p-double", ad_tr: "Çift Shot (Double)", ad_en: "Double Shot", fiyat: 140 }
            ],
            gorsel_url: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&auto=format&fit=crop&q=80",
            ozellikler: { alerjenler: [], hazirlama_suresi: "3 dk", kafein: true, sef_onerisi: true },
            aktif: true,
            created_at: new Date().toISOString()
          },
          {
            id: "prod-ornek-cheesecake",
            kategori_id: "cat-tatlilar",
            ad_tr: "San Sebastian Cheesecake",
            ad_en: "San Sebastian Cheesecake",
            aciklama_tr: "İçi akışkan, karamelize yanık kabuklu orijinal İspanyol usulü cheesecake.",
            aciklama_en: "Original Basque cheesecake with a caramelized crust and creamy center.",
            fiyat: 220,
            porsiyonlar: [
              { id: "p-dilim", ad_tr: "1 Dilim (Standart)", ad_en: "1 Slice (Standard)", fiyat: 220 },
              { id: "p-cikolatali", ad_tr: "Belçika Çikolatalı Soslu", ad_en: "With Belgian Chocolate Sauce", fiyat: 260 }
            ],
            gorsel_url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80",
            ozellikler: { alerjenler: ["Süt / Laktoz", "Yumurta"], hazirlama_suresi: "2 dk", vejetaryen: true, sef_onerisi: true },
            aktif: true,
            created_at: new Date().toISOString()
          }
        ]
      }

      triggerDownload(templateData, filename)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Şablon indirilirken bir hata oluştu."
      alert(errorMsg)
    } finally {
      setIsTemplateDownloading(false)
    }
  }

  // 3. Process File Upload & Dry Run
  const handleFileProcess = (file: File) => {
    setSelectedFile(file)
    setParseError(null)
    setDryRunResult(null)
    setImportSuccessMsg(null)
    setConfirmReplace(false)

    if (!file.name.endsWith(".json")) {
      setParseError("Lütfen geçerli bir .json dosyası seçiniz.")
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const json = JSON.parse(text)
        setParsedData(json)

        // Call dry-run endpoint to validate (with auth headers & credentials)
        setIsValidating(true)
        try {
          const dryRes = await fetch("/api/menu/import", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders()
            },
            body: JSON.stringify({ data: json, dry_run: true })
          })

          const result = await dryRes.json().catch(() => ({}))
          if (dryRes.ok && result.valid) {
            setDryRunResult(result)
            return
          } else if (result.errors) {
            setDryRunResult({
              valid: false,
              errors: result.errors,
              warnings: result.warnings || []
            })
            return
          }
        } catch {
          // Server offline or fetch failure fallback below
        }

        // Client-side instant validation fallback
        const rawCategories = Array.isArray(json?.categories) ? json.categories : []
        const rawProducts = Array.isArray(json?.products) ? json.products : []
        if (rawCategories.length > 0 && rawProducts.length > 0) {
          setDryRunResult({
            valid: true,
            categoryCount: rawCategories.length,
            productCount: rawProducts.length,
            warnings: [],
            message: `${rawCategories.length} kategori ve ${rawProducts.length} ürün yerel olarak doğrulandı.`
          })
        } else {
          setDryRunResult({
            valid: false,
            errors: ["Dosya içerisinde 'categories' veya 'products' dizileri bulunamadı veya boş."],
            warnings: []
          })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen ayrıştırma hatası"
        setParseError(`JSON formatı okunamadı: ${msg}`)
      } finally {
        setIsValidating(false)
      }
    }
    reader.onerror = () => {
      setParseError("Dosya okunurken bir hata oluştu.")
    }
    reader.readAsText(file)
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0])
    }
  }

  // 4. Handle Execute Import
  const handleExecuteImport = async () => {
    if (!parsedData || !dryRunResult?.valid) return
    if (importMode === "replace" && !confirmReplace) {
      alert("Lütfen menünün sıfırlanacağını onaylamak için onay kutusunu işaretleyiniz.")
      return
    }

    try {
      setIsImporting(true)
      const res = await fetch("/api/menu/import", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          data: parsedData,
          mode: importMode,
          dry_run: false
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || "İçe aktarma işlemi başarısız oldu.")
      }

      setImportSuccessMsg(data.message)
      await onImportSuccess()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Menü aktarılırken bir hata oluştu."
      alert(errorMsg)
    } finally {
      setIsImporting(false)
    }
  }

  const resetImport = () => {
    setSelectedFile(null)
    setParsedData(null)
    setParseError(null)
    setDryRunResult(null)
    setImportSuccessMsg(null)
    setConfirmReplace(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] sm:w-[92vw] md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden border-border bg-card text-foreground rounded-3xl shadow-2xl max-h-[92vh] flex flex-col transition-all duration-300"
      >
        {/* Top Header */}
        <DialogHeader className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-heading font-black text-foreground">
                  Menü Yedekleme & İçe Aktarma
                </DialogTitle>
                <DialogDescription className="text-xs text-foreground/60 hidden sm:block">
                  Konteyner Cafe & Roastery menü verilerini tek tıkla dışa aktarın veya güvenle geri yükleyin.
                </DialogDescription>
              </div>
            </div>

            {/* Custom Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 rounded-xl hover:bg-muted text-foreground/60 hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-muted/60 p-1 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "export"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Download className="h-4 w-4 text-primary" />
              <span>Yedek İndir (Dışa Aktar)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "import"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Upload className="h-4 w-4 text-primary" />
              <span>Menü Yükle (İçe Aktar)</span>
            </button>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[calc(92vh-140px)] no-scrollbar">
          
          {/* ============================================================== */}
          {/* TAB 1: EXPORT (DIŞA AKTARMA) */}
          {/* ============================================================== */}
          {activeTab === "export" && (
            <div className="flex flex-col gap-5">
              {/* Responsive 2-Column Grid on Tablet/Web */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                
                {/* Column 1: Full System Menu Backup Card */}
                <div className="p-5 sm:p-6 rounded-3xl bg-muted/40 border border-border flex flex-col justify-between gap-5 relative overflow-hidden group">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                        <FileJson className="h-4 w-4 text-primary" />
                        <span>Mevcut Menü Yedeği</span>
                      </div>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">
                        Canlı Sistem
                      </span>
                    </div>

                    {/* Quick Counts */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-2xs">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-lg font-black text-foreground">{totalCategories}</div>
                          <div className="text-[10px] text-foreground/55 font-bold uppercase tracking-wider">Kategori</div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-2xs">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-lg font-black text-foreground">{totalProducts}</div>
                          <div className="text-[10px] text-foreground/55 font-bold uppercase tracking-wider">Ürün</div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-foreground/70 leading-relaxed">
                      Sistemdeki tüm kahve ve mutfak ürünlerini, çoklu porsiyon ve fiyatlarını, yüksek çözünürlüklü
                      görselleri ve alerjen/nitelik etiketlerini standart <strong>.json</strong> formatında indirir.
                    </p>
                  </div>

                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-5 rounded-2xl font-bold text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Yedek Hazırlanıyor...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Tüm Menüyü İndir (.json)</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Column 2: Clean Format Template Card */}
                <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border flex flex-col justify-between gap-5 relative overflow-hidden">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        <span>Boş Format Şablonu</span>
                      </div>
                      <span className="text-[10px] font-black text-foreground/60 bg-muted px-2.5 py-0.5 rounded-full border border-border uppercase tracking-wider">
                        Rehber
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Örnek Ürünler & Porsiyon Yapısı</span>
                      </div>
                      <p className="text-xs text-foreground/65 leading-relaxed">
                        Sıfırdan bir menü kurmak veya Excel / metin editöründe menü verisi oluşturmak istiyorsanız,
                        sistemin kabul ettiği formatı içeren bu şablonu referans alabilirsiniz.
                      </p>
                    </div>

                    <ul className="text-xs text-foreground/60 space-y-1.5 pl-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>Espresso ve Cheesecake gibi örnek ürünler</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>Tek/Çift shot gibi çoklu porsiyon şeması</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>Doğrudan sisteme geri yüklenebilir format</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    disabled={isTemplateDownloading}
                    className="w-full py-5 rounded-2xl font-bold text-xs sm:text-sm border-border hover:bg-muted flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isTemplateDownloading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Şablon Hazırlanıyor...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 text-primary" />
                        <span>Örnek Format Şablonunu İndir</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bottom Notice Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border flex items-start gap-3 text-xs text-foreground/70">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-foreground font-bold">Felaket Kurtarma & Sunucu Taşıma İpucu:</strong>{" "}
                  İndirdiğiniz bu yedek dosyasını dilediğiniz zaman yan sekmedeki <strong>Menü Yükle (İçe Aktar)</strong>{" "}
                  bölümünden yükleyerek sistemi tek hamlede ayağa kaldırabilirsiniz.
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: IMPORT (İÇE AKTARMA) */}
          {/* ============================================================== */}
          {activeTab === "import" && (
            <div className="flex flex-col gap-5">
              
              {/* Case 1: Success Banner */}
              {importSuccessMsg && (
                <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-50">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold block text-sm sm:text-base">
                        Menü Başarıyla Sisteme Aktarıldı!
                      </strong>
                      <p className="text-xs sm:text-sm text-foreground/80 mt-1">{importSuccessMsg}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetImport}
                      className="flex-1 sm:flex-none text-xs font-bold rounded-xl py-4"
                    >
                      Yeni Dosya Yükle
                    </Button>
                    <Button
                      size="sm"
                      onClick={onClose}
                      className="flex-1 sm:flex-none text-xs font-bold rounded-xl py-4 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Paneli Görüntüle
                    </Button>
                  </div>
                </div>
              )}

              {/* Case 2: No File Selected (Dropzone & Rules side-by-side on Web) */}
              {!importSuccessMsg && !selectedFile && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                  
                  {/* Dropzone Column */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`md:col-span-7 border-2 border-dashed rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-200 min-h-[220px] ${
                      dragActive
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-black text-foreground block">
                        Menü Yedek Dosyasını Bırakın
                      </span>
                      <span className="text-xs text-foreground/55 mt-1 block">
                        veya bilgisayarınızdan bir <strong className="text-primary font-bold">.json</strong> dosyası seçin
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileProcess(e.target.files[0])
                        }
                      }}
                    />
                  </div>

                  {/* Requirements Column on Desktop */}
                  <div className="md:col-span-5 p-5 sm:p-6 rounded-3xl bg-muted/40 border border-border flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                        <FileCheck2 className="h-4 w-4 text-primary" />
                        <span>Format Gereksinimleri</span>
                      </div>
                      <p className="text-xs text-foreground/65 leading-relaxed">
                        Yüklenen her dosya sisteme yazılmadan önce otomatik olarak doğrulanır ve hata/uyarı listesi sunulur.
                      </p>

                      <div className="flex flex-col gap-2 pt-1 text-xs text-foreground/80">
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-[11px] bg-card px-1.5 py-0.5 rounded border border-border font-bold">categories</span>
                          <span className="text-[11px] text-foreground/60">Kategori listesi (id, ad_tr zorunlu)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-[11px] bg-card px-1.5 py-0.5 rounded border border-border font-bold">products</span>
                          <span className="text-[11px] text-foreground/60">Ürün listesi (id, ad_tr, fiyat, kategori_id zorunlu)</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-foreground/50 font-semibold italic border-t border-border/50 pt-3">
                      * Yanlış veya eksik alan içeren dosyalar sistem bütünlüğünü korumak adına reddedilir.
                    </div>
                  </div>
                </div>
              )}

              {/* Case 3: File Selected & Validated (Review & Mode selection) */}
              {!importSuccessMsg && selectedFile && (
                <div className="flex flex-col gap-5">
                  
                  {/* File Header Pill */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FileJson className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {selectedFile.name}
                        </div>
                        <div className="text-[11px] text-foreground/50">
                          {(selectedFile.size / 1024).toFixed(1)} KB — JSON Dosyası
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetImport}
                      className="text-xs font-bold text-foreground/60 hover:text-destructive rounded-xl shrink-0"
                    >
                      Farklı Dosya Seç
                    </Button>
                  </div>

                  {/* Validation Loading State */}
                  {isValidating && (
                    <div className="p-4 rounded-2xl bg-muted/50 border border-border flex items-center gap-3 text-xs">
                      <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                      <span>Dosya yapısı ve şema doğrulanıyor...</span>
                    </div>
                  )}

                  {/* Parse Error Box */}
                  {parseError && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-2.5 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Biçim Hatası:</strong>
                        <p className="mt-0.5">{parseError}</p>
                      </div>
                    </div>
                  )}

                  {/* Schema Validation Errors */}
                  {dryRunResult && !dryRunResult.valid && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2.5 text-xs">
                      <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Yüklenen Dosyada Şema Hataları Tespit Edildi:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-foreground/80 pl-1 max-h-40 overflow-y-auto">
                        {dryRunResult.errors?.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Schema Validation Success: 2-Column Responsive Layout on Desktop */}
                  {dryRunResult && dryRunResult.valid && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
                      
                      {/* Left Column: Validation Summary Card */}
                      <div className="md:col-span-5 flex flex-col gap-4">
                        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Şema Doğrulandı</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <div className="p-3 rounded-2xl bg-card border border-border">
                              <div className="text-base font-black text-foreground">{dryRunResult.categoryCount}</div>
                              <div className="text-[10px] text-foreground/60 font-bold uppercase">Kategori</div>
                            </div>
                            <div className="p-3 rounded-2xl bg-card border border-border">
                              <div className="text-base font-black text-foreground">{dryRunResult.productCount}</div>
                              <div className="text-[10px] text-foreground/60 font-bold uppercase">Ürün</div>
                            </div>
                          </div>

                          {dryRunResult.warnings && dryRunResult.warnings.length > 0 && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                              ⚠️ {dryRunResult.warnings.length} uyarı mevcut: {dryRunResult.warnings[0]}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Mode Selector & Execution Button */}
                      <div className="md:col-span-7 flex flex-col gap-4">
                        <div className="flex flex-col gap-2.5">
                          <span className="text-xs font-black uppercase tracking-wider text-foreground/70">
                            İçe Aktarma Yöntemi Seçin:
                          </span>

                          <label
                            className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                              importMode === "replace"
                                ? "border-primary bg-primary/5 shadow-xs"
                                : "border-border bg-card hover:bg-muted/30"
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="replace"
                              checked={importMode === "replace"}
                              onChange={() => setImportMode("replace")}
                              className="mt-1 text-primary accent-primary"
                            />
                            <div className="text-xs">
                              <span className="font-bold text-foreground block">
                                Sıfırdan Temiz Geri Yükle (Clean Restore)
                              </span>
                              <span className="text-foreground/60 leading-relaxed block mt-0.5">
                                Mevcut menüyü siler ve dosyayı sıfırdan kurar. Veritabanı taşıma veya tam geri yüklemeler için önerilir.
                              </span>
                            </div>
                          </label>

                          <label
                            className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                              importMode === "merge"
                                ? "border-primary bg-primary/5 shadow-xs"
                                : "border-border bg-card hover:bg-muted/30"
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="merge"
                              checked={importMode === "merge"}
                              onChange={() => setImportMode("merge")}
                              className="mt-1 text-primary accent-primary"
                            />
                            <div className="text-xs">
                              <span className="font-bold text-foreground block">
                                Mevcut Menüyle Birleştir (Merge / Upsert)
                              </span>
                              <span className="text-foreground/60 leading-relaxed block mt-0.5">
                                Var olan ürünleri korur; aynı ID&apos;ye sahip olanları günceller, yeni olanları menüye ekler.
                              </span>
                            </div>
                          </label>
                        </div>

                        {/* Confirmation Checkbox for Replace */}
                        {importMode === "replace" && (
                          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs">
                            <input
                              type="checkbox"
                              id="confirmReplace"
                              checked={confirmReplace}
                              onChange={(e) => setConfirmReplace(e.target.checked)}
                              className="mt-0.5 accent-amber-500"
                            />
                            <label htmlFor="confirmReplace" className="text-foreground font-medium cursor-pointer">
                              Mevcut menüdeki tüm ürün ve kategorilerin silinip yerine bu dosyadaki verilerin yazılacağını onaylıyorum.
                            </label>
                          </div>
                        )}

                        {/* Submit Button */}
                        <Button
                          onClick={handleExecuteImport}
                          disabled={isImporting || (importMode === "replace" && !confirmReplace)}
                          className="w-full py-5 rounded-2xl font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          {isImporting ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Menü Sisteme Yükleniyor...</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4" />
                              <span>
                                {importMode === "replace"
                                  ? "Sıfırdan Kurulumu Başlat"
                                  : "Birleştirmeyi Başlat"}
                              </span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
