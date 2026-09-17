"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoyaltyCustomer } from "@/lib/types/loyalty"
import { AlertTriangle, Trash2, Loader2, Coffee, Gift, ShieldAlert } from "lucide-react"

interface LoyaltyDeleteConfirmModalProps {
  customer: LoyaltyCustomer | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (customerId: string) => Promise<void>
  isDeleting: boolean
}

export function LoyaltyDeleteConfirmModal({
  customer,
  isOpen,
  onClose,
  onConfirm,
  isDeleting
}: LoyaltyDeleteConfirmModalProps) {
  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-card border border-border shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div className="p-3.5 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mb-1">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <DialogTitle className="text-lg font-black font-heading text-foreground">
            Müşteri Kaydını Sil
          </DialogTitle>
          <DialogDescription className="text-xs text-foreground/70">
            Bu müşteriyi sadakat programından silmek istediğinize emin misiniz?
          </DialogDescription>
        </DialogHeader>

        {/* Customer Information Preview Box */}
        <div className="p-4 rounded-2xl bg-muted/60 border border-border/80 flex flex-col gap-3 my-1">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">{customer.fullName}</span>
              <span className="text-xs font-mono text-foreground/60">{customer.phone}</span>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-card border border-border text-foreground font-semibold">
              #{customer.customerCode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-card border border-border flex items-center gap-2">
              <Coffee className="h-4 w-4 text-primary shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-foreground/50 uppercase">Mevcut Damga</span>
                <span className="font-bold text-foreground">{customer.currentStamps} Damga</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border flex items-center gap-2">
              <Gift className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-foreground/50 uppercase">Hediye Kahve</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {customer.freeCoffeesAvailable} Adet
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-destructive text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Bu işlem geri alınamaz. Müşterinin kayıtlı damgaları ve hediye bakiyeleri kalıcı olarak silinir.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={onClose}
            className="w-full sm:w-1/2 rounded-xl cursor-pointer"
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={() => onConfirm(customer.id)}
            className="w-full sm:w-1/2 rounded-xl font-bold cursor-pointer flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Siliniyor...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Evet, Müşteriyi Sil</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
