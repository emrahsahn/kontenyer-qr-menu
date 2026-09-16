"use client"

import React, { useState, useEffect } from "react"
import {
  LoyaltyCampaignConfig,
  LoyaltyCustomer,
  LoyaltyActionType,
  LoyaltyScopeType
} from "@/lib/types/loyalty"
import { Category, Product } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Coffee,
  Gift,
  Search,
  Plus,
  Settings,
  UserCheck,
  UserPlus,
  Loader2,
  Check,
  Layers,
  RotateCcw
} from "lucide-react"

interface LoyaltyManagerTabProps {
  categories: Category[]
  products: Product[]
  onShowToast: (msg: string) => void
}

export function LoyaltyManagerTab({
  categories,
  products,
  onShowToast
}: LoyaltyManagerTabProps) {
  const [subTab, setSubTab] = useState<"operations" | "settings">("operations")

  // Campaign Config State
  const [config, setConfig] = useState<LoyaltyCampaignConfig | null>(null)
  const [isConfigSaving, setIsConfigSaving] = useState(false)

  // Search & Customers State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<LoyaltyCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // customerId being modified

  // Quick Register State
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false)
  const [newCustName, setNewCustName] = useState("")
  const [newCustPhone, setNewCustPhone] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)

  // Config Form State (Local editing)
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formTargetStamps, setFormTargetStamps] = useState(4)
  const [formScopeType, setFormScopeType] = useState<LoyaltyScopeType>("all_drinks")
  const [formCategoryIds, setFormCategoryIds] = useState<string[]>([])
  const [formProductIds, setFormProductIds] = useState<string[]>([])
  const [formIsActive, setFormIsActive] = useState(true)

  // 1. Load Campaign Config cleanly in effect
  useEffect(() => {
    let active = true
    fetch("/api/loyalty/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data.config) return
        setConfig(data.config)
        setFormTitle(data.config.title)
        setFormDesc(data.config.description)
        setFormTargetStamps(data.config.targetStamps || 4)
        setFormScopeType(data.config.scopeType || "all_drinks")
        setFormCategoryIds(data.config.categoryIds || [])
        setFormProductIds(data.config.productIds || [])
        setFormIsActive(data.config.isActive !== false)
      })
      .catch((e) => console.error("Config fetch error:", e))

    return () => {
      active = false
    }
  }, [])

  // 2. Perform Customer Search
  const handleSearch = async (q: string) => {
    const clean = q.trim()
    setSearchQuery(q)

    if (!clean) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const res = await fetch(`/api/loyalty/customer?q=${encodeURIComponent(clean)}`, {
        cache: "no-store"
      })
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.customers || [])
        // If single match, auto-select
        if (data.customers && data.customers.length === 1) {
          setSelectedCustomer(data.customers[0])
        }
      }
    } catch (e) {
      console.error("Customer search error:", e)
    } finally {
      setIsSearching(false)
    }
  }

  // 3. Execute Loyalty Action (Add Stamp / Remove Stamp / Redeem Free)
  const handleLoyaltyAction = async (customerId: string, action: LoyaltyActionType) => {
    try {
      setActionLoading(customerId)
      const res = await fetch("/api/loyalty/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, action })
      })

      const data = await res.json()
      if (!res.ok || !data.customer) {
        throw new Error(data.error || "İşlem gerçekleştirilemedi.")
      }

      onShowToast(data.message || "İşlem kaydedildi!")

      // Update in results & selected
      setSelectedCustomer(data.customer)
      setSearchResults((prev) =>
        prev.map((c) => (c.id === customerId ? data.customer : c))
      )

      // Broadcast update to customer's open browser
      try {
        const bc = new BroadcastChannel("konteyner_loyalty_events")
        bc.postMessage({ type: "CUSTOMER_UPDATED", customerId })
        bc.close()
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : "İşlem sırasında hata oluştu."
      alert(msg)
    } finally {
      setActionLoading(null)
    }
  }

  // 4. Quick Customer Registration from Panel
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustName.trim() || !newCustPhone.trim()) return

    try {
      setIsRegistering(true)
      const res = await fetch("/api/loyalty/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newCustName.trim(),
          phone: newCustPhone.trim(),
          kvkkConsent: true
        })
      })

      const data = await res.json()
      if (!res.ok || !data.customer) {
        throw new Error(data.error || "Müşteri kaydedilemedi.")
      }

      onShowToast(`"${data.customer.fullName}" için sadakat kartı oluşturuldu! Kod: ${data.customer.customerCode}`)
      setSelectedCustomer(data.customer)
      setSearchResults([data.customer])
      setIsQuickRegisterOpen(false)
      setNewCustName("")
      setNewCustPhone("")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Müşteri kaydı yapılamadı."
      alert(msg)
    } finally {
      setIsRegistering(false)
    }
  }

  // 5. Save Campaign Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsConfigSaving(true)
      const res = await fetch("/api/loyalty/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim(),
          targetStamps: Number(formTargetStamps),
          scopeType: formScopeType,
          categoryIds: formCategoryIds,
          productIds: formProductIds,
          isActive: formIsActive
        })
      })

      const data = await res.json()
      if (!res.ok || !data.config) {
        throw new Error(data.error || "Ayarlar kaydedilemedi.")
      }

      setConfig(data.config)
      onShowToast("Sadakat kampanyası ayarları başarıyla kaydedildi!")

      // Broadcast config change
      try {
        const bc = new BroadcastChannel("konteyner_loyalty_events")
        bc.postMessage({ type: "CONFIG_UPDATED" })
        bc.close()
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ayarlar kaydedilirken hata oluştu."
      alert(msg)
    } finally {
      setIsConfigSaving(false)
    }
  }

  const targetStamps = config?.targetStamps || 4

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
      {/* Sub Tab Switcher */}
      <div className="flex items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-border">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab("operations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === "operations"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground/70 hover:text-foreground hover:bg-muted"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Müşteri & Damga İşlemleri</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === "settings"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground/70 hover:text-foreground hover:bg-muted"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Kampanya & Damga Ayarları</span>
            {config && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-md font-extrabold bg-background">
                {targetStamps} Damga
              </Badge>
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-2 text-xs font-semibold text-foreground/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sadakat Sistemi Aktif</span>
        </div>
      </div>

      {/* ========================================================
          SUBTAB 1: OPERATIONS (STAFF STAMPING & CUSTOMER LOOKUP)
          ======================================================== */}
      {subTab === "operations" && (
        <div className="flex flex-col gap-6">
          {/* Top Bar: Quick Search & Register */}
          <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Telefon no (05xx...), Müşteri Kodu (#KNT-...) veya İsim ile ara..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
            </div>

            <Button
              type="button"
              onClick={() => setIsQuickRegisterOpen(!isQuickRegisterOpen)}
              className="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider bg-secondary hover:bg-secondary/80 text-foreground border border-border cursor-pointer flex items-center gap-2 shrink-0"
            >
              <UserPlus className="h-4 w-4 text-primary" />
              <span>Yeni Müşteri Kartı Aç</span>
            </Button>
          </div>

          {/* Quick Register Drawer/Card if open */}
          {isQuickRegisterOpen && (
            <form
              onSubmit={handleQuickRegister}
              className="p-5 sm:p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex flex-col md:flex-row items-end gap-3.5 shadow-sm animate-in fade-in"
            >
              <div className="flex-1 w-full flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground/80">Müşteri Adı Soyadı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex-1 w-full flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground/80">Cep Telefonu</label>
                <input
                  type="tel"
                  required
                  placeholder="05xx xxx xx xx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer"
                >
                  {isRegistering ? "Kaydediliyor..." : "Kartı Oluştur"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsQuickRegisterOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                >
                  İptal
                </Button>
              </div>
            </form>
          )}

          {/* Search Result Matches Bar */}
          {searchResults.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-foreground/60 mr-1">Eşleşen Müşteriler:</span>
              {searchResults.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => setSelectedCustomer(cust)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-2 ${
                    selectedCustomer?.id === cust.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-foreground/30 text-foreground"
                  }`}
                >
                  <span>{cust.fullName}</span>
                  <span className="font-mono opacity-70">({cust.customerCode})</span>
                </button>
              ))}
            </div>
          )}

          {/* Active Customer Action Console */}
          {selectedCustomer ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-md flex flex-col gap-6">
              {/* Customer Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Coffee className="h-7 w-7" />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black font-heading text-foreground">
                        {selectedCustomer.fullName}
                      </h2>
                      <Badge className="font-mono font-black text-xs px-2.5 py-0.5 bg-secondary text-foreground">
                        {selectedCustomer.customerCode}
                      </Badge>
                    </div>
                    <span className="text-xs font-medium text-foreground/60 mt-0.5">
                      Tel: {selectedCustomer.phone} • Kayıt: {new Date(selectedCustomer.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </div>

                {/* Free Coffee Badge if earned */}
                {selectedCustomer.freeCoffeesAvailable > 0 && (
                  <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm flex items-center gap-2 shadow-xs">
                    <Gift className="h-5 w-5 animate-bounce text-emerald-600 dark:text-emerald-400" />
                    <span>{selectedCustomer.freeCoffeesAvailable} Adet Hediye Kahvesi Var!</span>
                  </div>
                )}
              </div>

              {/* Progress & Visual Stamp Cups */}
              <div className="p-5 rounded-2xl bg-muted/40 border border-border flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground/70">Mevcut Damga Durumu:</span>
                  <span className="text-foreground font-mono font-black text-sm">
                    {selectedCustomer.currentStamps} / {targetStamps} Damga
                  </span>
                </div>

                {/* Cup Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 items-center">
                  {Array.from({ length: targetStamps }).map((_, idx) => {
                    const isFilled = idx < selectedCustomer.currentStamps
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          isFilled
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-sm"
                            : "bg-background border-dashed border-border text-foreground/30"
                        }`}
                      >
                        <Coffee className={`h-6 w-6 ${isFilled ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                        <span className="text-[10px] font-mono font-black">
                          {isFilled ? `Damga ${idx + 1}` : `Boş ${idx + 1}`}
                        </span>
                      </div>
                    )
                  })}

                  {/* Free Coffee Reward Target Box */}
                  <div
                    className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      selectedCustomer.freeCoffeesAvailable > 0
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-amber-500/5 border-dashed border-amber-500/30 text-amber-600/50"
                    }`}
                  >
                    <Gift className={`h-6 w-6 ${selectedCustomer.freeCoffeesAvailable > 0 ? "animate-pulse stroke-[2.5]" : "stroke-[1.5]"}`} />
                    <span className="text-[10px] font-black uppercase tracking-tight">
                      {selectedCustomer.freeCoffeesAvailable > 0 ? "Hediye Hazır!" : "Hediye"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (Staff Stamping Controls) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* 1. Add Stamp Button */}
                <Button
                  type="button"
                  disabled={actionLoading === selectedCustomer.id}
                  onClick={() => handleLoyaltyAction(selectedCustomer.id, "STAMP_ADD")}
                  className="py-6 rounded-2xl font-black font-heading text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>+1 Kahve Damgala</span>
                </Button>

                {/* 2. Redeem Free Coffee Button */}
                <Button
                  type="button"
                  disabled={
                    actionLoading === selectedCustomer.id ||
                    selectedCustomer.freeCoffeesAvailable <= 0
                  }
                  onClick={() => handleLoyaltyAction(selectedCustomer.id, "REDEEM_FREE")}
                  className={`py-6 rounded-2xl font-black font-heading text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedCustomer.freeCoffeesAvailable > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/20"
                      : "bg-muted text-foreground/30 cursor-not-allowed border border-border"
                  }`}
                >
                  <Gift className="h-5 w-5" />
                  <span>1 Hediye Kahveyi Kullandır</span>
                </Button>

                {/* 3. Undo / Remove Stamp Button */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    actionLoading === selectedCustomer.id ||
                    (selectedCustomer.currentStamps === 0 &&
                      selectedCustomer.freeCoffeesAvailable === 0)
                  }
                  onClick={() => handleLoyaltyAction(selectedCustomer.id, "STAMP_REMOVE")}
                  className="py-6 rounded-2xl font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 hover:text-destructive border-border cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Son İşlemi Geri Al</span>
                </Button>
              </div>

              {/* Overall Statistics Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-xs text-foreground/60 font-medium">
                <div className="flex items-center gap-4">
                  <span>Toplam Kazanılan: <strong className="text-foreground">{selectedCustomer.totalStampsEarned} Damga</strong></span>
                  <span>Toplam Kullanılan: <strong className="text-foreground">{selectedCustomer.totalFreeRedeemed} Hediye</strong></span>
                </div>
                <span>Son Güncelleme: {new Date(selectedCustomer.updatedAt).toLocaleTimeString("tr-TR")}</span>
              </div>
            </div>
          ) : (
            /* Empty State when no customer selected */
            <div className="p-12 rounded-3xl bg-card/60 border border-dashed border-border flex flex-col items-center justify-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-muted text-foreground/40">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-base font-black font-heading text-foreground">
                Müşteri Kartı Seçilmedi
              </h3>
              <p className="text-xs text-foreground/60 max-w-sm font-medium">
                Müşterinin telefon numarasını, adını veya gösterdiği <strong>#KNT-xxxx</strong> kodunu aratarak damga işlemlerini başlatabilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUBTAB 2: SETTINGS (DYNAMIC CAMPAIGN CONFIGURATION)
          ======================================================== */}
      {subTab === "settings" && (
        <form
          onSubmit={handleSaveConfig}
          className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-md flex flex-col gap-7"
        >
          <div className="flex flex-col gap-1 pb-5 border-b border-border">
            <h3 className="text-lg font-black font-heading text-foreground">
              Sadakat Programı & Damga Yapılandırması
            </h3>
            <p className="text-xs text-foreground/60 font-medium">
              Kampanyanın kaç damgada bir hediye vereceğini ve hangi içeceklerde geçerli olacağını buradan özelleştirebilirsiniz.
            </p>
          </div>

          {/* 1. Target Stamps Selector (User requested: 3 alana 4. veya 4 alana 5.) */}
          <div className="flex flex-col gap-3">
            <label className="text-xs uppercase tracking-wider font-black text-primary flex items-center gap-1.5">
              <Coffee className="h-4 w-4" /> Hedef Damga Sayısı (Kaç Kahve Alana 1 Hediye?)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormTargetStamps(num)}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    formTargetStamps === num
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-102"
                      : "bg-background border-border hover:border-foreground/30 text-foreground"
                  }`}
                >
                  <span className="text-lg font-black font-heading">{num} Damga</span>
                  <span className={`text-[11px] font-bold ${formTargetStamps === num ? "text-primary-foreground/80" : "text-foreground/50"}`}>
                    {num} Alana {num + 1}. Bedava
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Scope Type Selector (All Drinks vs Categories vs Selected Products) */}
          <div className="flex flex-col gap-3">
            <label className="text-xs uppercase tracking-wider font-black text-primary flex items-center gap-1.5">
              <Layers className="h-4 w-4" /> Kampanya Ürün Kapsamı
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormScopeType("all_drinks")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  formScopeType === "all_drinks"
                    ? "bg-primary/10 border-primary text-foreground shadow-xs"
                    : "bg-background border-border text-foreground/70"
                }`}
              >
                <strong className="text-xs font-extrabold text-foreground">Tüm İçecekler</strong>
                <span className="text-[11px] text-foreground/60 leading-normal">
                  Menüdeki tüm sıcak kahveler, soğuk kahveler ve demlemeler geçerlidir.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormScopeType("categories")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  formScopeType === "categories"
                    ? "bg-primary/10 border-primary text-foreground shadow-xs"
                    : "bg-background border-border text-foreground/70"
                }`}
              >
                <strong className="text-xs font-extrabold text-foreground">Belirli Kategoriler</strong>
                <span className="text-[11px] text-foreground/60 leading-normal">
                  Yalnızca seçtiğiniz kahve kategorilerindeki ürünler damga kazandırır.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormScopeType("products")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  formScopeType === "products"
                    ? "bg-primary/10 border-primary text-foreground shadow-xs"
                    : "bg-background border-border text-foreground/70"
                }`}
              >
                <strong className="text-xs font-extrabold text-foreground">Özel Seçili Ürünler</strong>
                <span className="text-[11px] text-foreground/60 leading-normal">
                  Yalnızca tek tek işaretlediğiniz içecekler (örn: Espresso, Latte) geçerlidir.
                </span>
              </button>
            </div>

            {/* Category selection list if categories scope selected */}
            {formScopeType === "categories" && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-wrap gap-2 mt-1">
                <span className="text-xs font-bold text-foreground/70 w-full mb-1">Geçerli Kategorileri Seçiniz:</span>
                {categories.map((cat) => {
                  const isChecked = formCategoryIds.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormCategoryIds((prev) =>
                          isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                        )
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-foreground/80 hover:border-foreground/30"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                      <span>{cat.ad_tr}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Product selection list if products scope selected */}
            {formScopeType === "products" && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border max-h-56 overflow-y-auto flex flex-col gap-2 mt-1">
                <span className="text-xs font-bold text-foreground/70 mb-1">Geçerli İçecekleri Seçiniz:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {products.map((prod) => {
                    const isChecked = formProductIds.includes(prod.id)
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setFormProductIds((prev) =>
                            isChecked ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                          )
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? "bg-primary/15 border-primary text-foreground"
                            : "bg-card border-border text-foreground/70 hover:border-foreground/30"
                        }`}
                      >
                        <span className="truncate">{prod.ad_tr}</span>
                        {isChecked ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                        ) : (
                          <span className="text-[10px] text-foreground/40 font-mono shrink-0 ml-2">
                            ₺{prod.fiyat}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Titles & Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground/80">Kampanya Başlığı</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Örn: Konteyner Kahve Kulübü"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground/80">Açıklama</label>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Örn: 4 kahve alana 5. kahve bizden hediye!"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* 4. Active Toggle & Submit Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-5 w-5 rounded accent-primary cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Kampanya Aktif</span>
                <span className="text-[11px] text-foreground/50">
                  Pasif yapıldığında menüdeki sadakat butonu otomatik gizlenir.
                </span>
              </div>
            </label>

            <Button
              type="submit"
              disabled={isConfigSaving}
              className="px-8 py-5 rounded-2xl font-black font-heading text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all cursor-pointer"
            >
              {isConfigSaving ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
