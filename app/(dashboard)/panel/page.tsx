"use client"

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react"
import { Product, Category } from "@/lib/types/database"
import { ProductManagementModal } from "@/components/dashboard/product-management-modal"
import { CategoryManagementModal } from "@/components/dashboard/category-management-modal"
import { MenuBackupModal } from "@/components/dashboard/menu-backup-modal"
import { ProductDeleteDialog } from "@/components/dashboard/product-delete-dialog"
import { LoyaltyManagerTab } from "@/components/dashboard/loyalty-manager-tab"
import { TableQrCardPrinter } from "@/components/dashboard/table-qr-card-printer"
import { QRCodeCanvas } from "qrcode.react"
import Image from "next/image"
import Link from "next/link"
import {
  Utensils,
  Plus,
  Layers,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Sparkles,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  HardDriveDownload,
  Coffee
} from "lucide-react"

// Static subscription helper for origin
const subscribeToNothing = (_onChange: () => void) => () => {}

export default function StaffPanelPage() {
  const [activeTab, setActiveTab] = useState<"menu" | "loyalty" | "qr">("menu")

  // Menu data
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)

  // QR & Copy states
  const [copied, setCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Get current origin safely
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
    () => "http://localhost:3000"
  )

  const menuUrl = `${origin}/menu`

  // Fetch Menu Data from server API
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products?include_inactive=true", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" })
      ])

      if (prodRes.ok && catRes.ok) {
        const prodData = await prodRes.json()
        const catData = await catRes.json()

        if (prodData.products && Array.isArray(prodData.products)) {
          setProducts(prodData.products)
        }
        if (catData.categories && Array.isArray(catData.categories)) {
          setCategories(catData.categories)
        }
      }
    } catch (err) {
      console.error("Panel data fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) fetchData()
    })
    return () => {
      active = false
    }
  }, [fetchData])

  // Quick Toggle Active (Tükendi / Stokta)
  const handleToggleActive = async (product: Product) => {
    try {
      // Optimistic update
      const updatedList = products.map((p) =>
        p.id === product.id ? { ...p, aktif: !p.aktif } : p
      )
      setProducts(updatedList)

      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id })
      })

      if (res.ok) {
        showToast(
          product.aktif
            ? `"${product.ad_tr}" TÜKENDİ olarak işaretlendi.`
            : `"${product.ad_tr}" tekrar STOKTA olarak işaretlendi.`
        )
        // Broadcast event to other tabs
        try {
          const bc = new BroadcastChannel("yali_menu_events")
          bc.postMessage({ type: "MENU_UPDATED" })
          bc.close()
          window.dispatchEvent(new Event("yali_menu_updated"))
        } catch {}
      } else {
        await fetchData()
      }
    } catch {
      await fetchData()
    }
  }

  // Save Product (Create or Edit)
  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      const isEdit = !!productData.id
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      })

      if (res.ok) {
        showToast(isEdit ? "Ürün başarıyla güncellendi." : "Yeni ürün başarıyla eklendi.")
        setIsProductModalOpen(false)
        setSelectedProduct(null)
        await fetchData()

        try {
          const bc = new BroadcastChannel("yali_menu_events")
          bc.postMessage({ type: "MENU_UPDATED" })
          bc.close()
          window.dispatchEvent(new Event("yali_menu_updated"))
        } catch {}
      } else {
        const err = await res.json()
        alert(err.error || "Ürün kaydedilirken bir hata oluştu.")
      }
    } catch {
      alert("Sunucu bağlantı hatası oluştu.")
    }
  }

  // Delete Product with Double-Confirmation Dialog
  const handleConfirmDeleteProduct = async (productId: string) => {
    const targetProduct = products.find((p) => p.id === productId) || productToDelete
    const productName = targetProduct?.ad_tr || "Ürün"

    const res = await fetch(`/api/products?id=${productId}`, {
      method: "DELETE"
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || "Ürün silinemedi. Lütfen tekrar deneyin.")
    }

    showToast(`"${productName}" menüden başarıyla silindi.`)
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    setProductToDelete(null)

    try {
      const bc = new BroadcastChannel("konteyner_menu_events")
      bc.postMessage({ type: "MENU_UPDATED" })
      bc.close()
      window.dispatchEvent(new Event("konteyner_menu_updated"))
    } catch {}
  }

  // Category Handlers
  const handleAddCategory = async (adTr: string, adEn: string, sira: number) => {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_tr: adTr, ad_en: adEn, sira })
      })
      if (res.ok) {
        showToast("Kategori başarıyla eklendi.")
        await fetchData()
      } else {
        alert("Kategori eklenemedi.")
      }
    } catch {
      alert("Kategori ekleme sırasında hata oluştu.")
    }
  }

  const handleUpdateCategory = async (id: string, adTr: string, adEn: string, sira: number) => {
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ad_tr: adTr, ad_en: adEn, sira })
      })
      if (res.ok) {
        showToast("Kategori güncellendi.")
        await fetchData()
      } else {
        alert("Kategori güncellenemedi.")
      }
    } catch {
      alert("Kategori güncelleme sırasında hata oluştu.")
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        showToast("Kategori silindi.")
        await fetchData()
      } else {
        alert("Kategori silinemedi.")
      }
    } catch {
      alert("Kategori silme sırasında hata oluştu.")
    }
  }

  // Copy Menu URL
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(menuUrl)
      setCopied(true)
      showToast("Müşteri menü linki panoya kopyalandı!")
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Download QR as PNG
  const handleDownloadQrPng = () => {
    const canvas = qrCanvasRef.current || (document.getElementById("konteyner-qr-canvas") as HTMLCanvasElement)
    if (!canvas) {
      alert("QR Kod yüklenemedi.")
      return
    }

    const pngUrl = canvas.toDataURL("image/png")
    const downloadLink = document.createElement("a")
    downloadLink.href = pngUrl
    downloadLink.download = "Konteyner_Cafe_QR_Menu.png"
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    showToast("QR Kod görseli başarıyla indirildi.")
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.kategori_id === selectedCategory
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.ad_tr.toLowerCase().includes(q) ||
      (p.ad_en && p.ad_en.toLowerCase().includes(q)) ||
      (p.aciklama_tr && p.aciklama_tr.toLowerCase().includes(q))
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.aktif !== false) ||
      (statusFilter === "inactive" && p.aktif === false)

    return matchesCat && matchesSearch && matchesStatus
  })

  const activeCount = products.filter((p) => p.aktif !== false).length
  const outOfStockCount = products.filter((p) => p.aktif === false).length

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-card border border-primary/40 text-foreground px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full flex-1 flex flex-col pt-1 sm:pt-2 min-w-0 max-w-full overflow-x-hidden">
        
        {/* Top Tab Navigation & Status Bar */}
        <div className="w-full border border-border bg-card rounded-2xl p-1.5 sm:p-2 mb-4 sm:mb-6 flex items-center justify-between gap-2 shadow-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                activeTab === "menu"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "text-foreground/60 hover:text-foreground hover:bg-muted"
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span>Menü &amp; Ürün Yönetimi</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "menu" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground/70"
              }`}>
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("loyalty")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                activeTab === "loyalty"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "text-foreground/60 hover:text-foreground hover:bg-muted"
              }`}
            >
              <Coffee className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Sadakat Programı</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
                Damga
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                activeTab === "qr"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "text-foreground/60 hover:text-foreground hover:bg-muted"
              }`}
            >
              <QrCode className="h-4 w-4 shrink-0" />
              <span>QR Kod &amp; Menü Bağlantısı</span>
            </button>
          </div>

          {/* Quick Counts (Large screens) */}
          <div className="hidden lg:flex items-center gap-2 px-2 shrink-0">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {activeCount} Aktif
            </span>
            {outOfStockCount > 0 && (
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                {outOfStockCount} Tükendi
              </span>
            )}
          </div>
        </div>
        
        {/* TAB 1: MENU & PRODUCT MANAGEMENT */}
        {activeTab === "menu" && (
          <div className="flex flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
            
            {/* Action Bar & Quick Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 bg-card/60 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-border">
              {/* Stats & Quick overview */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 sm:py-1.5 rounded-xl bg-secondary border border-border font-semibold">
                  <span className="text-foreground/70">Toplam Ürün:</span>
                  <strong className="text-foreground">{products.length}</strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Aktif (Stokta):</span>
                  <strong>{activeCount}</strong>
                </div>
                {outOfStockCount > 0 && (
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-2 px-3 py-2 sm:py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold animate-pulse">
                    <span>Tükendi:</span>
                    <strong>{outOfStockCount}</strong>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBackupModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold text-foreground transition-all cursor-pointer"
                  >
                    <HardDriveDownload className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">Yedekle &amp; Aktar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold text-foreground transition-all cursor-pointer"
                  >
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">Kategorileri Yönet</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null)
                    setIsProductModalOpen(true)
                  }}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Yeni Ürün Ekle</span>
                </button>
              </div>
            </div>

            {/* Search & Category Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Yemek adı, içerik veya açıklama ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-card border border-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-card p-1 rounded-2xl border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    statusFilter === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  Tümü ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    statusFilter === "active" ? "bg-primary text-primary-foreground shadow-xs" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  Stokta ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    statusFilter === "inactive" ? "bg-primary text-primary-foreground shadow-xs" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  Tükendi ({outOfStockCount})
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-primary/15 border-primary text-primary shadow-2xs"
                    : "bg-card border-border text-foreground/70 hover:text-foreground"
                }`}
              >
                Tüm Kategoriler
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                    selectedCategory === cat.id
                      ? "bg-primary/15 border-primary text-primary shadow-2xs"
                      : "bg-card border-border text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {cat.ad_tr}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-foreground/50">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-semibold">Menü ürünleri yükleniyor...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border flex flex-col items-center justify-center text-center gap-3">
                <Utensils className="h-8 w-8 text-foreground/40" />
                <h3 className="font-bold text-base">Aradığınız kriterde ürün bulunamadı</h3>
                <p className="text-xs text-foreground/60 max-w-sm">
                  Farklı bir arama terimi deneyebilir veya &quot;Yeni Ürün Ekle&quot; butonu ile yeni bir yemek ekleyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const isSoldOut = !product.aktif
                  const categoryName = categories.find((c) => c.id === product.kategori_id)?.ad_tr || "Kategori"

                  return (
                    <div
                      key={product.id}
                      className={`relative flex flex-col rounded-2xl sm:rounded-3xl border bg-card p-3.5 sm:p-4 transition-all duration-300 shadow-sm hover:shadow-md ${
                        isSoldOut ? "border-destructive/30 bg-card/60 opacity-85" : "border-border"
                      }`}
                    >
                      {/* Top Row: Image & Info */}
                      <div className="flex gap-3">
                        <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-muted">
                          <Image
                            src={product.gorsel_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60"}
                            alt={product.ad_tr}
                            fill
                            unoptimized
                            className={`object-cover ${isSoldOut ? "grayscale-[50%]" : ""}`}
                          />
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-1">
                              <span className="bg-destructive text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider text-center">
                                TÜKENDİ
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title, Category & Price */}
                        <div className="flex-1 flex flex-col min-w-0 justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider truncate">
                                {categoryName}
                              </span>
                              <span className="font-sans font-extrabold text-xs sm:text-sm text-primary tabular-nums tracking-tight whitespace-nowrap">
                                {product.porsiyonlar && product.porsiyonlar.length > 1
                                  ? `₺${Math.min(...product.porsiyonlar.map(p => Number(p.fiyat) || 0)).toFixed(2)}'den`
                                  : `₺${Number(product.fiyat).toFixed(2)}`}
                              </span>
                            </div>

                            <h3 className="font-heading font-bold text-sm text-foreground truncate mt-0.5">
                              {product.ad_tr}
                            </h3>

                            {product.aciklama_tr && (
                              <p className="text-[11px] text-foreground/60 line-clamp-2 mt-0.5 font-medium leading-snug">
                                {product.aciklama_tr}
                              </p>
                            )}
                          </div>

                          {/* Quick Badges */}
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {product.porsiyonlar && product.porsiyonlar.length > 1 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                                ✨ {product.porsiyonlar.length} Seçenek
                              </span>
                            )}
                            {product.ozellikler?.sef_onerisi && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                ⭐ Şefin Özel
                              </span>
                            )}
                            {product.ozellikler?.vejetaryen && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                🌱 Veg
                              </span>
                            )}
                            {product.ozellikler?.acili && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                🌶️ Acılı
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-border my-2.5 sm:my-3" />

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between gap-2">
                        {/* 1-Click Tükendi Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product)}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                            product.aktif
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/15 hover:bg-destructive/25 border-destructive/40 text-destructive"
                          }`}
                        >
                          {product.aktif ? (
                            <>
                              <Eye className="h-3.5 w-3.5 shrink-0" />
                              <span>Stokta (Aktif)</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5 shrink-0" />
                              <span>Tükendi Yapıldı</span>
                            </>
                          )}
                        </button>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(product)
                              setIsProductModalOpen(true)
                            }}
                            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground/80 hover:text-foreground transition-all cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                            title="Ürünü Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOYALTY PROGRAM & STAMP MANAGER */}
        {activeTab === "loyalty" && (
          <LoyaltyManagerTab
            categories={categories}
            products={products}
            onShowToast={showToast}
          />
        )}

        {/* TAB 3: QR CODE & 7.5x10 CM TABLE CARD PRINTER */}
        {activeTab === "qr" && (
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">
            {/* 7.5x10 cm Table Card Printing & Download Suite */}
            <TableQrCardPrinter baseMenuUrl={menuUrl} />

            {/* General Direct Link & Standalone QR Box */}
            <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-md flex flex-col items-center text-center relative overflow-hidden">
              <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest mb-1">
                <QrCode className="h-4 w-4" />
                DİREKT MENÜ BAĞLANTISI & HIZLI KOD
              </div>
              <h3 className="font-heading font-black text-xl text-foreground">
                Genel Ortak Menü Linki
              </h3>
              <p className="text-xs text-foreground/60 max-w-md mt-1">
                Masa numarası olmaksızın doğrudan menüyü açan ortak bağlantı.
              </p>

              {/* URL Display & Copy */}
              <div className="w-full max-w-lg mt-6 flex flex-col gap-2 text-left">
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-secondary border border-border">
                  <span className="flex-1 text-xs font-mono font-semibold px-2 text-foreground truncate">
                    {menuUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Kopyalandı!" : "Kopyala"}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4 text-primary" />
                  <span>Tekil Ham QR (PNG) İndir</span>
                </button>

                <Link
                  href="/menu"
                  target="_blank"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border font-bold text-xs uppercase tracking-wider text-foreground transition-all"
                >
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <span>Menüyü Yeni Sekmede Aç</span>
                </Link>
              </div>

              {/* Hidden Canvas for standard standalone QR download */}
              <div className="hidden">
                <QRCodeCanvas
                  id="konteyner-qr-canvas"
                  ref={qrCanvasRef}
                  value={`${menuUrl}?qr=konteyner`}
                  size={400}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Management Modal */}
      <ProductManagementModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
        categories={categories}
        onSave={handleSaveProduct}
        onOpenCategoryModal={() => {
          setIsProductModalOpen(false)
          setIsCategoryModalOpen(true)
        }}
        onDelete={(prod) => {
          setIsProductModalOpen(false)
          setSelectedProduct(null)
          setProductToDelete(prod)
        }}
      />

      {/* Product Double-Confirmation Delete Dialog */}
      <ProductDeleteDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        product={productToDelete}
        categoryName={categories.find((c) => c.id === productToDelete?.kategori_id)?.ad_tr}
        onConfirmDelete={handleConfirmDeleteProduct}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Menu Backup & Restore Modal */}
      <MenuBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        totalCategories={categories.length}
        totalProducts={products.length}
        categories={categories}
        products={products}
        onImportSuccess={async () => {
          await fetchData()
          showToast("Menü yedeği başarıyla sisteme aktarıldı!")
          try {
            const bc = new BroadcastChannel("konteyner_menu_events")
            bc.postMessage({ type: "MENU_UPDATED" })
            bc.close()
            window.dispatchEvent(new Event("konteyner_menu_updated"))
          } catch {}
        }}
      />
    </div>
  )
}
