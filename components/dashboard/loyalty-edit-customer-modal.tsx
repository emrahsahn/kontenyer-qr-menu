"use client"

import React, { useState } from "react"
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
import {
  UserCog,
  Phone,
  User,
  Coffee,
  Gift,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Check
} from "lucide-react"

interface LoyaltyEditCustomerModalProps {
  customer: LoyaltyCustomer | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: LoyaltyCustomer) => void
  onShowToast: (msg: string) => void
}

function LoyaltyEditCustomerForm({
  customer,
  onClose,
  onSuccess,
  onShowToast
}: {
  customer: LoyaltyCustomer
  onClose: () => void
  onSuccess: (updated: LoyaltyCustomer) => void
  onShowToast: (msg: string) => void
}) {
  const [fullName, setFullName] = useState(customer.fullName || "")
  const [phone, setPhone] = useState(customer.phone || "")
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const cleanName = fullName.trim()
    const cleanPhone = phone.trim()

    if (!cleanName) {
      setFormError("Lütfen geçerli bir ad ve soyad giriniz.")
      return
    }

    if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 10) {
      setFormError("Lütfen geçerli bir telefon numarası giriniz (örn: 05xx xxx xx xx).")
      return
    }

    try {
      setIsSaving(true)
      const res = await fetch("/api/loyalty/customer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer.id,
          fullName: cleanName,
          phone: cleanPhone
        })
      })

      const data = await res.json()
      if (!res.ok || !data.customer) {
        throw new Error(data.error || "Müşteri bilgileri güncellenemedi.")
      }

      onShowToast("Müşteri bilgileri başarıyla güncellendi.")
      onSuccess(data.customer)
      onClose()
    } catch (err) {
      console.error("Update customer error:", err)
      const msg = err instanceof Error ? err.message : "Güncelleme sırasında hata oluştu."
      setFormError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogContent className="max-w-md p-6 rounded-3xl bg-card border border-border shadow-2xl">
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <DialogHeader className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black font-heading text-foreground">
                Müşteri Bilgilerini Düzenle
              </DialogTitle>
              <DialogDescription className="text-xs text-foreground/60">
                İsim veya telefon düzeltildiğinde mevcut damgalar ve hediye hakları korunur.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Readonly Perks & ID Bar */}
        <div className="p-3.5 rounded-2xl bg-muted/50 border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Coffee className="h-3.5 w-3.5" />
              <span>{customer.currentStamps} Damga</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Gift className="h-3.5 w-3.5" />
              <span>{customer.freeCoffeesAvailable} Hediye</span>
            </div>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-card border border-border text-foreground font-semibold">
            #{customer.customerCode}
          </span>
        </div>

        {/* Form Inputs */}
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Adı ve Soyadı</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Müşteri Adı Soyadı"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span>Cep Telefonu Numarası</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Information Note */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2 text-xs text-foreground/70">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Telefon numarasını değiştirdiğinizde, müşterinin tüm damgaları yeni numaraya aktarılır.
          </p>
        </div>

        {/* Error Message */}
        {formError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onClose}
            className="w-full sm:w-1/2 rounded-xl cursor-pointer"
          >
            Vazgeç
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-1/2 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Değişiklikleri Kaydet</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function LoyaltyEditCustomerModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}: LoyaltyEditCustomerModalProps) {
  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <LoyaltyEditCustomerForm
          key={customer.id}
          customer={customer}
          onClose={onClose}
          onSuccess={onSuccess}
          onShowToast={onShowToast}
        />
      )}
    </Dialog>
  )
}
