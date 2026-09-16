"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Product } from "@/lib/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Trash2,
  Lock,
  Check,
  Coffee,
  Loader2,
  ShieldAlert,
  Info
} from "lucide-react"

interface ProductDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  categoryName?: string
  onConfirmDelete: (productId: string) => Promise<boolean | void>
}

export function ProductDeleteDialog({
  isOpen,
  onClose,
  product,
  categoryName,
  onConfirmDelete
}: ProductDeleteDialogProps) {
  const [isSecondConfirmationChecked, setIsSecondConfirmationChecked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Adjust state during render when a different product is selected or dialog opens
  const [prevKey, setPrevKey] = useState<string | null>(null)
  const currentKey = isOpen && product ? product.id : null

  if (currentKey !== prevKey) {
    setPrevKey(currentKey)
    setIsSecondConfirmationChecked(false)
    setIsDeleting(false)
    setErrorMessage(null)
  }

  if (!product) return null

  const handleDelete = async () => {
    if (!isSecondConfirmationChecked || isDeleting) return

    try {
      setIsDeleting(true)
      setErrorMessage(null)
      await onConfirmDelete(product.id)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ürün silinirken beklenmeyen bir hata oluştu."
      setErrorMessage(msg)
      setIsDeleting(false)
    }
  }

  const portionCount = product.porsiyonlar && product.porsiyonlar.length > 0 ? product.porsiyonlar.length : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl border border-destructive/20 shadow-2xl bg-card">
        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-destructive/80 via-destructive to-destructive/80" />

        <div className="p-6 sm:p-7 flex flex-col gap-5">
          {/* Header with Danger Badge & Icon */}
          <DialogHeader className="gap-2 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-black uppercase tracking-wider border border-destructive/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>İkinci Doğrulama Gerekli</span>
              </div>
            </div>

            <div className="flex items-start gap-3 mt-1">
              <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black font-heading tracking-tight text-foreground">
                  Ürünü Menüden Sil
                </DialogTitle>
                <DialogDescription className="text-xs text-foreground/65 font-medium mt-0.5">
                  Bu işlem seçilen ürünü QR menüden ve tüm masalardan kalıcı olarak kaldıracaktır.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Product Snapshot Card */}
          <div className="p-3.5 rounded-2xl bg-muted/50 border border-border flex items-center gap-3.5">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-background shrink-0 border border-border flex items-center justify-center">
              {product.gorsel_url ? (
                <Image
                  src={product.gorsel_url}
                  alt={product.ad_tr}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <Coffee className="h-7 w-7 text-foreground/30" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {categoryName && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-background/80">
                    {categoryName}
                  </Badge>
                )}
                {portionCount && (
                  <span className="text-[10px] text-foreground/60 font-semibold">
                    {portionCount} Porsiyon
                  </span>
                )}
              </div>

              <h4 className="text-sm font-black text-foreground truncate font-heading">
                {product.ad_tr}
              </h4>
              {product.ad_en && (
                <p className="text-[11px] text-foreground/50 truncate italic font-medium">
                  {product.ad_en}
                </p>
              )}

              <div className="mt-1 text-xs font-black text-primary">
                ₺{Number(product.fiyat).toLocaleString("tr-TR")}
              </div>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              Bu işlem geri alınamaz. Müşteriler masalardan bu ürünü artık görüntüleyemez veya yeni sipariş oluşturamaz.
            </span>
          </div>

          {/* Second Confirmation Checkbox Component */}
          <div
            onClick={() => !isDeleting && setIsSecondConfirmationChecked(!isSecondConfirmationChecked)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
              isSecondConfirmationChecked
                ? "bg-destructive/10 border-destructive/40 shadow-xs"
                : "bg-background border-border hover:border-foreground/30"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg mt-0.5 flex items-center justify-center transition-all shrink-0 border ${
                isSecondConfirmationChecked
                  ? "bg-destructive border-destructive text-destructive-foreground shadow-xs"
                  : "border-foreground/30 bg-card"
              }`}
            >
              {isSecondConfirmationChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>

            <div className="flex-1">
              <label className="text-xs font-extrabold text-foreground cursor-pointer block leading-tight">
                İkinci Onay: Ürünü silmek istediğimi onaylıyorum
              </label>
              <p className="text-[11px] text-foreground/60 font-medium mt-1 leading-normal">
                &ldquo;<span className="font-bold text-foreground">{product.ad_tr}</span>&rdquo; ürününün sistemden kalıcı olarak silinmesine izin veriyorum.
              </p>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={onClose}
              className="flex-1 py-5 rounded-2xl text-xs font-extrabold uppercase tracking-wider border-border hover:bg-muted/80 cursor-pointer"
            >
              Vazgeç
            </Button>

            <Button
              type="button"
              disabled={!isSecondConfirmationChecked || isDeleting}
              onClick={handleDelete}
              className={`flex-1 py-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                isSecondConfirmationChecked
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/25 ring-2 ring-destructive/20"
                  : "bg-muted text-foreground/40 cursor-not-allowed border border-border"
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Siliniyor...</span>
                </>
              ) : isSecondConfirmationChecked ? (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Kalıcı Olarak Sil</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Onay Bekleniyor</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
