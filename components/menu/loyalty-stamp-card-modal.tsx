"use client"

import React, { useState, useEffect, useCallback } from "react"
import { LoyaltyCampaignConfig, LoyaltyCustomer } from "@/lib/types/loyalty"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Coffee,
  Gift,
  Sparkles,
  Check,
  ShieldCheck,
  Copy,
  Info,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  LogOut
} from "lucide-react"

interface LoyaltyStampCardModalProps {
  isOpen: boolean
  onClose: () => void
}

const LOCAL_STORAGE_KEY = "kontenyer_loyalty_customer"

export function LoyaltyStampCardModal({ isOpen, onClose }: LoyaltyStampCardModalProps) {
  const [config, setConfig] = useState<LoyaltyCampaignConfig | null>(null)
  const [customer, setCustomer] = useState<LoyaltyCustomer | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has("reset_card")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        return null
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as LoyaltyCustomer
        if (parsed && parsed.id) return parsed
      }
    } catch {}
    return null
  })
  const [isLoading, setIsLoading] = useState(true)

  // Registration Form States
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [kvkkConsent, setKvkkConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [regStep, setRegStep] = useState<"input" | "confirm">("input")

  // Sub-modals
  const [isKvkkModalOpen, setIsKvkkModalOpen] = useState(false)
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // 1. Manual or Broadcast Refresh
  const handleManualRefresh = useCallback(async () => {
    if (!customer?.id) return
    try {
      const res = await fetch(`/api/loyalty/customer?id=${customer.id}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (data.customer) {
          setCustomer(data.customer)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.customer))
        }
      }
    } catch (e) {
      console.warn("Failed to refresh customer card:", e)
    }
  }, [customer])

  // Initial load config & API sync
  useEffect(() => {
    if (!isOpen) return
    let active = true

    if (customer?.id) {
      fetch(`/api/loyalty/customer?id=${customer.id}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (active && data.customer) {
            setCustomer(data.customer)
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.customer))
          }
        })
        .catch((e) => console.warn("Failed to refresh customer card:", e))
    }

    fetch("/api/loyalty/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (active && data.config) {
          setConfig(data.config)
        }
      })
      .catch((e) => console.warn("Failed to fetch loyalty config:", e))
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, customer?.id])

  // Real-time broadcast listener for instant stamp updates
  useEffect(() => {
    if (typeof window === "undefined" || !customer?.id) return

    try {
      const bc = new BroadcastChannel("konteyner_loyalty_events")
      bc.onmessage = (event) => {
        if (event.data?.customerId === customer.id) {
          handleManualRefresh()
        }
      }
      return () => {
        bc.close()
      }
    } catch {
      // BroadcastChannel not supported fallback
    }
  }, [customer?.id, handleManualRefresh])

  // Step 1: Proceed to Confirmation Screen
  const handleProceedToConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFormError(null)

    if (!fullName.trim()) {
      setFormError("Lütfen ad ve soyadınızı giriniz.")
      return
    }
    const cleanDigits = phone.replace(/\D/g, "")
    if (cleanDigits.length < 10) {
      setFormError("Lütfen geçerli bir telefon numarası giriniz (örn: 05xx xxx xx xx).")
      return
    }
    if (!kvkkConsent) {
      setFormError("Sadakat kartı oluşturmak için KVKK Aydınlatma Metni'ni onaylamanız gerekmektedir.")
      return
    }

    setRegStep("confirm")
  }

  // Step 2: Final Registration Execution
  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFormError(null)

    if (!fullName.trim()) {
      setFormError("Lütfen ad ve soyadınızı giriniz.")
      return
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setFormError("Lütfen geçerli bir telefon numarası giriniz (örn: 05xx xxx xx xx).")
      return
    }
    if (!kvkkConsent) {
      setFormError("Sadakat kartı oluşturmak için KVKK Aydınlatma Metni'ni onaylamanız gerekmektedir.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/loyalty/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          kvkkConsent: true
        })
      })

      const data = await res.json()
      if (!res.ok || !data.customer) {
        throw new Error(data.error || "Kart oluşturulamadı.")
      }

      setCustomer(data.customer)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.customer))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu."
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyCode = () => {
    if (!customer?.customerCode) return
    navigator.clipboard.writeText(customer.customerCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch {}
    setCustomer(null)
    setFullName("")
    setPhone("")
    setKvkkConsent(false)
    setRegStep("input")
    setFormError(null)
    setIsLogoutConfirmOpen(false)
  }

  const targetStamps = config?.targetStamps || 4
  const currentStamps = customer?.currentStamps || 0
  const freeCoffees = customer?.freeCoffeesAvailable || 0

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl border border-border shadow-2xl bg-card">
          {/* Top Brand Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600" />

          <div className="p-5 sm:p-7 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <DialogHeader className="text-left gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider border border-amber-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{config?.title || "Konteyner Kahve Kulübü"}</span>
                </div>

                {customer && (
                  <button
                    type="button"
                    onClick={() => handleManualRefresh()}
                    title="Yenile"
                    className="p-1.5 rounded-xl hover:bg-muted text-foreground/50 hover:text-foreground transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <DialogTitle className="text-xl font-black font-heading tracking-tight text-foreground mt-2">
                {customer ? "Dijital Damga Kartınız" : "Kahve Sadakat Kartını Başlat"}
              </DialogTitle>
              <DialogDescription className="text-xs text-foreground/70 font-medium">
                {customer
                  ? `${targetStamps} kahveye 1 kahve hediye! Damgalarını biriktir, sürprizleri yakala.`
                  : config?.description || "Seçili içeceklerde damgaları topla, bir sonraki kahven bizden hediye!"}
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
                <span className="text-xs font-bold text-foreground/60">Sadakat kartı yükleniyor...</span>
              </div>
            ) : !customer ? (
              /* =======================================
                 1. REGISTRATION (2-STEP WITH CONFIRMATION)
                 ======================================= */
              regStep === "input" ? (
                /* Step 1: Input Form */
                <form onSubmit={handleProceedToConfirm} className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="text-xs text-foreground/80 leading-relaxed font-medium">
                      <strong className="text-foreground font-extrabold block mb-0.5">
                        {targetStamps} Kahve Alana Bir Sonraki Hediye!
                      </strong>
                      Telefon numaranızla anında kartınızı oluşturun, her siparişte garsonunuza kodunuzu söyleyerek damga kazanın.
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground/80">Adınız ve Soyadınız</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Emrah Şahin"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground/80">Cep Telefonu Numaranız</label>
                    <input
                      type="tel"
                      required
                      placeholder="05xx xxx xx xx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-[10px] text-foreground/50 font-medium">
                      * SMS şifresi beklemenize gerek yoktur. Cihaz değiştirseniz dahi telefon numaranızla haklarınız korunur.
                    </span>
                  </div>

                  {/* KVKK Consent Checkbox */}
                  <div className="p-3 rounded-2xl border border-border bg-muted/30 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="kvkk-consent"
                      checked={kvkkConsent}
                      onChange={(e) => setKvkkConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <label htmlFor="kvkk-consent" className="text-[11px] text-foreground/75 leading-snug cursor-pointer">
                      Konteyner Cafe & Roastery Sadakat Programı kapsamında kişisel verilerimin işlenmesine ilişkin{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setIsKvkkModalOpen(true)
                        }}
                        className="underline font-bold text-primary hover:text-primary/80 inline"
                      >
                        KVKK Aydınlatma Metni&apos;ni
                      </button>{" "}
                      okudum ve kabul ediyorum.
                    </label>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full py-6 rounded-2xl font-heading font-black text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all cursor-pointer mt-1 flex items-center justify-center gap-2"
                  >
                    <span>Devam Et (Bilgileri Kontrol Et)</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                /* Step 2: Confirmation Screen (Prevents Typos) */
                <div className="flex flex-col gap-4 animate-in fade-in-50 duration-200">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-3 text-center items-center">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black font-heading text-foreground">
                        Girdiğiniz Bilgileri Onaylayın
                      </h4>
                      <p className="text-xs text-foreground/60 mt-0.5">
                        Damgalarınızın kaybolmaması için telefon numaranızın doğruluğunu kontrol ediniz.
                      </p>
                    </div>

                    {/* Big Customer Info Card */}
                    <div className="w-full p-4 rounded-2xl bg-card border border-border flex flex-col gap-2.5 text-left shadow-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Ad Soyad</span>
                        <span className="text-sm font-bold text-foreground">{fullName.trim()}</span>
                      </div>
                      <div className="h-px w-full bg-border/60" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Telefon Numarası</span>
                        <span className="text-base font-black font-mono text-primary tracking-wide">{phone.trim()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
                    <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Sadakat kartınız bu telefon numarasına bağlanacaktır. Damgalarınız bu numara üzerinden birikir.</span>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Back or Confirm & Start Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => setRegStep("input")}
                      className="w-full sm:w-2/5 py-5 rounded-2xl cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Düzelt</span>
                    </Button>

                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleRegister()}
                      className="w-full sm:w-3/5 py-5 rounded-2xl font-heading font-black text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Hazırlanıyor...</span>
                        </>
                      ) : (
                        <>
                          <Coffee className="h-4 w-4" />
                          <span>Evet, Kartımı Başlat</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            ) : (
              /* =======================================
                 2. ACTIVE DIGITAL STAMP CARD (STARBUCKS STYLE)
                 ======================================= */
              <div className="flex flex-col gap-5">
                {/* Customer Snapshot & Code Card */}
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between gap-3 relative overflow-hidden">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Sadakat Kartı Sahibi
                    </span>
                    <h3 className="text-base font-black text-foreground font-heading mt-0.5">
                      {customer.fullName}
                    </h3>
                    <span className="text-[11px] text-foreground/50 font-medium">
                      {customer.phone.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, "$1 *** ** $4")}
                    </span>
                  </div>

                  {/* Customer Code Box */}
                  <div
                    onClick={copyCode}
                    className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all cursor-pointer group"
                    title="Kodu Kopyala"
                  >
                    <span className="text-[9px] font-black text-foreground/50 uppercase tracking-widest">
                      Müşteri Kodu
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-primary tracking-wider group-hover:scale-105 transition-transform">
                      {customer.customerCode}
                    </span>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                      {copiedCode ? (
                        <>
                          <Check className="h-2.5 w-2.5" /> Kopyalandı
                        </>
                      ) : (
                        <>
                          <Copy className="h-2.5 w-2.5" /> Kodu Kopyala
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Free Coffee Reward Announcement Banner (if available) */}
                {freeCoffees > 0 && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/20 to-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-md animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm shrink-0">
                        <Gift className="h-6 w-6 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black font-heading leading-tight">
                          🎉 {freeCoffees} Adet Ücretsiz Kahveniz Hazır!
                        </h4>
                        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Sipariş verirken personelinize kodunuzu gösterip hediyenizi isteyebilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Stamp Slots Container */}
                <div className="p-5 rounded-3xl bg-muted/40 border border-border flex flex-col gap-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-foreground flex items-center gap-1.5">
                      <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>İlerleme Durumu</span>
                    </span>
                    <span className="font-mono font-black text-foreground/70">
                      {currentStamps} / {targetStamps} Damga
                    </span>
                  </div>

                  {/* Stamp Cups Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 items-center justify-center">
                    {Array.from({ length: targetStamps }).map((_, idx) => {
                      const isFilled = idx < currentStamps
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border transition-all ${
                            isFilled
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-sm"
                              : "bg-background/80 border-dashed border-border text-foreground/30"
                          }`}
                        >
                          <div className="relative">
                            <Coffee className={`h-6 w-6 ${isFilled ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                            {isFilled && (
                              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-black shadow-xs">
                                ✓
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-black font-mono mt-0.5">
                            {idx + 1}
                          </span>
                        </div>
                      )
                    })}

                    {/* Final Free Coffee Reward Slot */}
                    <div
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border transition-all ${
                        freeCoffees > 0
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-amber-500/5 border-dashed border-amber-500/30 text-amber-600/50"
                      }`}
                    >
                      <Gift className={`h-6 w-6 ${freeCoffees > 0 ? "animate-pulse stroke-[2.5]" : "stroke-[1.5]"}`} />
                      <span className="text-[9px] font-black uppercase tracking-tight text-center leading-none mt-0.5">
                        {freeCoffees > 0 ? "Hediyen!" : "Hediye"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-background overflow-hidden border border-border/80">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentStamps / targetStamps) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Campaign Scope Info Button */}
                <button
                  type="button"
                  onClick={() => setIsScopeModalOpen(true)}
                  className="px-4 py-3 rounded-2xl bg-muted/60 hover:bg-muted border border-border text-xs font-bold text-foreground/80 hover:text-foreground flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <span>Geçerli İçecekler ve Kurallar</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-foreground/40" />
                </button>

                {/* Footer Notice */}
                <div className="text-[11px] text-foreground/50 text-center font-medium leading-relaxed px-2">
                  * Sipariş verirken garsonunuza veya baristanıza müşteri kodunuzu (<strong>{customer.customerCode}</strong>) belirterek anında damganızı işletebilirsiniz.
                </div>

                {/* Logout / Switch Card Action */}
                <div className="pt-1 border-t border-border/40 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    className="text-xs text-foreground/45 hover:text-destructive transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-xl hover:bg-muted font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Çıkış Yap / Kartı Değiştir</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* =======================================
          3. KVKK AYDINLATMA METNİ MODALI
          ======================================= */}
      <Dialog open={isKvkkModalOpen} onOpenChange={setIsKvkkModalOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-card border border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold w-fit mb-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>KVKK Aydınlatma Metni</span>
            </div>
            <DialogTitle className="text-base font-black font-heading">
              Kişisel Verilerin Korunması ve İşlenmesi
            </DialogTitle>
          </DialogHeader>

          <div className="text-xs text-foreground/80 leading-relaxed max-h-72 overflow-y-auto space-y-2.5 pr-2">
            <p>
              <strong>Konteyner Cafe & Roastery</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) kapsamında, kahve sadakat programı üyelerimizin kişisel verilerinin güvenliğine en üst düzeyde önem veriyoruz.
            </p>
            <p>
              <strong>1. İşlenen Veriler:</strong> Ad, Soyad ve Cep Telefonu Numarası.
            </p>
            <p>
              <strong>2. İşleme Amacı:</strong> Sadakat kartınızın tanımlanması, kahve damgalarınızın kaydedilmesi, hak ettiğiniz hediye kahvelerin hesaplanması ve mükerrer kayıtların önlenmesi.
            </p>
            <p>
              <strong>3. Aktarım:</strong> Kişisel verileriniz hiçbir üçüncü şahıs veya reklam amacıyla kesinlikle paylaşılmaz ve satılmaz.
            </p>
            <p>
              <strong>4. Saklama:</strong> Dilediğiniz an personelle iletişime geçerek sadakat kartınızı ve kayıtlı verilerinizi sildirme hakkına sahipsiniz.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => setIsKvkkModalOpen(false)}
              className="w-full py-4 rounded-2xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
            >
              Anladım ve Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =======================================
          4. KAMPANYA GEÇERLİ İÇECEKLER MODALI
          ======================================= */}
      <Dialog open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-card border border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold w-fit mb-1">
              <Coffee className="h-3.5 w-3.5" />
              <span>Kampanya Detayları</span>
            </div>
            <DialogTitle className="text-base font-black font-heading">
              Hangi İçecekler Damga Kazandırır?
            </DialogTitle>
          </DialogHeader>

          <div className="text-xs text-foreground/80 leading-relaxed space-y-3 py-1">
            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border">
              <strong className="text-foreground block mb-1">🎯 Kampanya Kuralı:</strong>
              Masa veya paket siparişlerinizde her {targetStamps} adet geçerli içecek alımınızda, {targetStamps + 1}. içeceğiniz tamamen ücretsiz olarak hediye edilir.
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <strong className="text-amber-700 dark:text-amber-300 block mb-1">☕ Kapsam:</strong>
              {config?.scopeType === "all_drinks" && (
                <span>Menümüzdeki tüm sıcak kahveler, soğuk kahveler ve nitelikli demlemeler geçerlidir.</span>
              )}
              {config?.scopeType === "categories" && (
                <span>Yalnızca işletmemiz tarafından belirlenen seçili kahve kategorileri dahildir.</span>
              )}
              {config?.scopeType === "products" && (
                <span>Yalnızca belirli seçili içecekler kampanyaya dahildir.</span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => setIsScopeModalOpen(false)}
              className="w-full py-4 rounded-2xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
            >
              Tamam
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =======================================
          5. ÇIKIŞ YAPMA / KARTI DEĞİŞTİRME ONAY MODALI
          ======================================= */}
      <Dialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
        <DialogContent className="max-w-sm w-full p-6 rounded-3xl bg-card border border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold w-fit mb-1">
              <LogOut className="h-3.5 w-3.5" />
              <span>Karttan Çıkış</span>
            </div>
            <DialogTitle className="text-base font-black font-heading">
              Karttan Çıkış Yapılsın mı?
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/70 leading-relaxed pt-1">
              Bu cihazdaki kayıtlı kart oturumunuz sonlandırılacaktır. Birikmiş damgalarınız ve hediyeleriniz kaybolmaz; telefon numaranızla tekrar giriş yaptığınızda kartınıza anında erişebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="rounded-xl text-xs font-semibold py-2.5 px-4 cursor-pointer"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
              className="rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Evet, Çıkış Yap</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
