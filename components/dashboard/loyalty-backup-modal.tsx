"use client"

import React, { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoyaltyCustomer } from "@/lib/types/loyalty"
import {
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Database,
  Users,
  ShieldCheck,
  X,
  ArrowRight,
  Loader2,
  Coffee,
  Gift,
  Server,
  FileCheck2,
  Info
} from "lucide-react"

interface LoyaltyBackupModalProps {
  isOpen: boolean
  onClose: () => void
  totalCustomers: number
  customers?: LoyaltyCustomer[]
  onImportSuccess: () => Promise<void>
  onShowToast: (msg: string) => void
}

export function LoyaltyBackupModal({
  isOpen,
  onClose,
  totalCustomers,
  customers = [],
  onImportSuccess,
  onShowToast
}: LoyaltyBackupModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export")

  // Export states
  const [isExporting, setIsExporting] = useState(false)

  // Import states
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [dryRunResult, setDryRunResult] = useState<{
    valid: boolean
    customerCount?: number
    errors?: string[]
    warnings?: string[]
    message?: string
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compute stats for export card
  const totalStamps = customers.reduce((acc, c) => acc + (c.currentStamps || 0), 0)
  const totalFreeCoffees = customers.reduce((acc, c) => acc + (c.freeCoffeesAvailable || 0), 0)

  // 1. Export Handler (Infallible download)
  const handleExport = async () => {
    try {
      setIsExporting(true)
      const res = await fetch("/api/loyalty/backup", { cache: "no-store" })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Yedek indirilemedi.")
      }

      const blob = await res.blob()
      const dateStr = new Date().toISOString().split("T")[0]
      const filename = `kontenyer_sadakat_yedegi_${dateStr}.json`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      onShowToast("Sadakat programı yedeği başarıyla indirildi.")
    } catch (err) {
      console.error("Loyalty export error:", err)
      const msg = err instanceof Error ? err.message : "Yedekleme sırasında bir sorun oluştu."
      onShowToast(msg)
    } finally {
      setIsExporting(false)
    }
  }

  // 2. File Selection & Dry Run Validation
  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      setParseError("Lütfen sadece geçerli bir .json dosyası seçiniz.")
      setSelectedFile(null)
      setParsedData(null)
      setDryRunResult(null)
      return
    }

    setSelectedFile(file)
    setParseError(null)
    setDryRunResult(null)

    try {
      setIsValidating(true)
      const text = await file.text()
      const json = JSON.parse(text)
      setParsedData(json)

      // Dry run validation via API
      const res = await fetch("/api/loyalty/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: json, dry_run: true })
      })

      const result = await res.json()
      if (res.ok && result.valid) {
        setDryRunResult({
          valid: true,
          customerCount: result.customerCount,
          warnings: result.warnings,
          message: result.message
        })
      } else {
        setDryRunResult({
          valid: false,
          errors: result.errors || [result.error || "Doğrulama başarısız."],
          warnings: result.warnings,
          customerCount: result.customerCount
        })
      }
    } catch (err) {
      console.error("JSON parse error:", err)
      setParseError("JSON formatı çözümlenemedi. Dosyanın bozulmadığından emin olunuz.")
    } finally {
      setIsValidating(false)
    }
  }

  // 3. Drag and Drop events
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
      handleFile(e.dataTransfer.files[0])
    }
  }

  // 4. Reset Import State
  const resetImport = () => {
    setSelectedFile(null)
    setParsedData(null)
    setParseError(null)
    setDryRunResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 5. Execute Import
  const handleExecuteImport = async () => {
    if (!parsedData || !dryRunResult?.valid) return

    try {
      setIsImporting(true)
      const res = await fetch("/api/loyalty/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: parsedData,
          mode: importMode,
          dry_run: false
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "İçe aktarma başarısız.")
      }

      onShowToast(data.message || "Sadakat verileri başarıyla sisteme aktarıldı.")
      await onImportSuccess()
      onClose()
    } catch (err) {
      console.error("Import execution error:", err)
      const msg = err instanceof Error ? err.message : "İçe aktarma hatası."
      onShowToast(msg)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isImporting && onClose()}>
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
                  Sadakat Programı Veri Yedekleme & Aktarım
                </DialogTitle>
                <DialogDescription className="text-xs text-foreground/60 hidden sm:block">
                  Konteyner Cafe kayıtlı müşteri listesini, damgaları ve hediye bakiyelerini güvenle yedekleyin veya geri yükleyin.
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
                  ? "bg-card text-foreground shadow-sm font-black border border-border"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Download className="h-4 w-4 text-primary" />
              <span>Dışa Aktar (Yedek İndir)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "import"
                  ? "bg-card text-foreground shadow-sm font-black border border-border"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Upload className="h-4 w-4 text-primary" />
              <span>Müşteri Yükle (İçe Aktar)</span>
            </button>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[calc(92vh-140px)]">
          {/* ============================================================== */}
          {/* TAB 1: EXPORT (DIŞA AKTARMA) */}
          {/* ============================================================== */}
          {activeTab === "export" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Column 1: Live System Loyalty Backup Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-muted/40 border border-border flex flex-col justify-between gap-5 relative overflow-hidden">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                      <FileJson className="h-4 w-4 text-primary" />
                      <span>Mevcut Sadakat Yedeği</span>
                    </div>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">
                      Canlı Sistem
                    </span>
                  </div>

                  {/* 3 Stats Overview Cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="p-3 rounded-2xl bg-card border border-border flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 font-bold uppercase tracking-wider">
                        <Users className="h-3 w-3 text-primary" />
                        <span>Müşteri</span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-foreground">{totalCustomers}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-card border border-border flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 font-bold uppercase tracking-wider">
                        <Coffee className="h-3 w-3 text-amber-500" />
                        <span>Damga</span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-foreground">{totalStamps}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-card border border-border flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 font-bold uppercase tracking-wider">
                        <Gift className="h-3 w-3 text-emerald-500" />
                        <span>Hediye</span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{totalFreeCoffees}</div>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/70 leading-relaxed">
                    Sistemdeki tüm müşterilerin isim, telefon numarası, <strong>#KNT-xxxx</strong> kart kodları, aktif damga adetleri, kazanılmış hediye hakları ve kampanya yapılandırmasını standart <strong>.json</strong> formatında tek tıkla cihazınıza kaydeder.
                  </p>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full py-5 rounded-2xl font-bold text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Yedek Dosyası Hazırlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Sadakat Yedeğini İndir (.json)</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Column 2: Disaster Recovery & Security Information Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border flex flex-col justify-between gap-5 relative overflow-hidden">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Afet Kurtarma & Güvenlik</span>
                    </div>
                    <span className="text-[10px] font-black text-foreground/60 bg-muted px-2.5 py-0.5 rounded-full border border-border uppercase tracking-wider">
                      Güvenlik
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Server className="h-4 w-4 text-primary" />
                      <span>Veritabanı Çökmesine Karşı Tam Koruma</span>
                    </div>
                    <p className="text-xs text-foreground/65 leading-relaxed">
                      Redis veya yerel depolama arızalarında müşterilerinizin kazandığı damgalar ve hediye kahveler kaybolmaz. Aldığınız yedeği yeni sunucuya saniyeler içinde geri yükleyebilirsiniz.
                    </p>
                  </div>

                  <ul className="text-xs text-foreground/65 space-y-2 pl-1">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>Müşterinin cep telefonu ve `#KNT-xxxx` kart kodu birebir korunur.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>Müşterinin telefonunda açılan kart anında güncel damgalarla açılır.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>KVKK uyumlu anonim kimlik doğrulama verileri eksiksiz yedeklenir.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/15 flex items-center gap-2.5 text-xs text-foreground/70">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span>Haftada en az 1 kez sadakat yedeği almanız önerilir.</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: IMPORT (İÇE AKTARMA / GERİ YÜKLEME) */}
          {/* ============================================================== */}
          {activeTab === "import" && (
            <div className="flex flex-col gap-5">
              {/* File Dropzone (Large, inviting) */}
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-10 sm:p-14 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center gap-4 cursor-pointer transition-all ${
                    dragActive
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFile(e.target.files[0])
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <FileJson className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold font-heading text-foreground">
                      JSON Sadakat Yedek Dosyasını Sürükleyip Bırakın
                    </h4>
                    <p className="text-xs text-foreground/50 mt-1 max-w-md">
                      Daha önce indirdiğiniz <strong>kontenyer_sadakat_yedegi_...json</strong> dosyasını buraya bırakın veya bilgisayarınızdan seçin.
                    </p>
                  </div>
                </div>
              ) : (
                /* 2-Column Responsive Layout for Uploaded File & Execution */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  {/* Left Column: File Details & Validation Result */}
                  <div className="flex flex-col gap-4">
                    {/* Selected File Box */}
                    <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                          <FileJson className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block truncate max-w-[220px] sm:max-w-[260px]">
                            {selectedFile.name}
                          </span>
                          <span className="text-[10px] text-foreground/50">
                            {(selectedFile.size / 1024).toFixed(1)} KB • JSON Yedeği
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetImport}
                        className="h-8 w-8 p-0 rounded-lg text-foreground/50 hover:text-destructive cursor-pointer"
                        title="Dosyayı Değiştir"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Parse Error */}
                    {parseError && (
                      <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{parseError}</span>
                      </div>
                    )}

                    {/* Validating State */}
                    {isValidating && (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-foreground/60">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span>Yedek dosyası doğrulanıyor...</span>
                      </div>
                    )}

                    {/* Dry Run Validation Card */}
                    {dryRunResult && (
                      <div
                        className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                          dryRunResult.valid
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {dryRunResult.valid ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                          )}
                          <span
                            className={`text-xs font-bold ${
                              dryRunResult.valid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                            }`}
                          >
                            {dryRunResult.valid ? "Yedek Dosyası Başarıyla Doğrulandı" : "Dosya Formatı Uyumsuz"}
                          </span>
                        </div>

                        {dryRunResult.valid ? (
                          <div className="flex flex-col gap-2 text-xs text-foreground/75">
                            <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                              <span className="text-foreground/60 font-medium">Doğrulanan Müşteri Sayısı:</span>
                              <strong className="text-foreground text-sm">{dryRunResult.customerCount} Kişi</strong>
                            </div>
                            <p className="text-[11px] text-foreground/60 leading-relaxed">
                              Dosya içerisindeki tüm telefonlar, kart kodları ve damga bakiyeleri geçerli şemaya tam uyumludur.
                            </p>
                          </div>
                        ) : (
                          <div className="text-xs text-destructive/85 space-y-1">
                            {dryRunResult.errors?.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Import Mode & Action Execution */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border flex flex-col justify-between gap-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                        <FileCheck2 className="h-4 w-4 text-primary" />
                        <span>Aktarım Seçenekleri</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setImportMode("merge")}
                          className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                            importMode === "merge"
                              ? "bg-primary/10 border-primary shadow-xs"
                              : "bg-muted/40 border-border hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">Birleştir (Önerilen)</span>
                            {importMode === "merge" && (
                              <span className="text-[10px] font-black text-primary uppercase">Seçili</span>
                            )}
                          </div>
                          <span className="text-[11px] text-foreground/60 mt-0.5 block">
                            Mevcut müşterileri korur, çakışan numaraların damgalarını günceller ve yenileri ekler.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setImportMode("replace")}
                          className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                            importMode === "replace"
                              ? "bg-destructive/10 border-destructive shadow-xs"
                              : "bg-muted/40 border-border hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-destructive">Tümünün Üzerine Yaz (Replace)</span>
                            {importMode === "replace" && (
                              <span className="text-[10px] font-black text-destructive uppercase">Seçili</span>
                            )}
                          </div>
                          <span className="text-[11px] text-foreground/60 mt-0.5 block">
                            Mevcut listeyi tamamen temizler ve sadece bu yedek dosyasındaki müşterileri yazar.
                          </span>
                        </button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      disabled={!dryRunResult?.valid || isImporting}
                      onClick={handleExecuteImport}
                      className="w-full py-5 rounded-2xl font-black font-heading text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Veriler Sisteme Aktarılıyor...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4" />
                          <span>Müşterileri Sisteme Aktar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
