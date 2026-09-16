"use client"

import React, { useState } from "react"
import { useStaff, WaiterProfile } from "@/lib/context/staff-context"
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Coffee,
  AlertCircle
} from "lucide-react"

interface StaffManagementTabProps {
  venue?: 'restaurant' | 'cafe' | 'club' | 'seafood';
}

const AVATAR_COLORS = [
  "bg-rose-500 text-white",
  "bg-blue-500 text-white",
  "bg-amber-500 text-white",
  "bg-emerald-500 text-white",
  "bg-purple-600 text-white",
  "bg-indigo-600 text-white",
  "bg-teal-600 text-white",
  "bg-pink-600 text-white",
  "bg-orange-600 text-white"
]

export function StaffManagementTab({ venue }: StaffManagementTabProps = {}) {
  const {
    waiters,
    addWaiter,
    deleteWaiter,
    toggleWaiterActive,
    tableAssignments
  } = useStaff()

  // Filter staff based on venue if provided
  const displayedWaiters = venue
    ? waiters.filter(w => (w.venue || 'cafe') === venue)
    : waiters

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Form States - Add Staff
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<WaiterProfile['role']>("barista")
  const [selectedColor, setSelectedColor] = useState("bg-rose-500 text-white")
  const [addError, setAddError] = useState<string | null>(null)

  // Handle Add Staff Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    if (!newName.trim()) {
      setAddError("Lütfen personel adını girin.")
      return
    }

    const result = addWaiter(newName.trim(), "", selectedColor, "cafe", newRole)
    if (result.success) {
      setIsAddModalOpen(false)
      setNewName("")
      setAddError(null)
    } else {
      setAddError(result.error || "Personel eklenemedi.")
    }
  }

  const handleDeleteStaff = (staff: WaiterProfile) => {
    if (waiters.length <= 1) {
      alert("En az bir personelin sistemde kayıtlı olması gereklidir.")
      return
    }
    if (confirm(`'${staff.name}' adlı personeli silmek istediğinize emin misiniz?`)) {
      deleteWaiter(staff.id)
    }
  }

  const activeCount = displayedWaiters.filter(w => w.isActive).length
  const inactiveCount = displayedWaiters.filter(w => !w.isActive).length

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Top Banner & Quick Action */}
      <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="font-heading font-black text-xl text-foreground">
              Cafe &amp; Barista Personel Yönetimi
            </h2>
          </div>
          <p className="text-xs text-foreground/60 font-semibold max-w-xl">
            Konteyner ekibindeki baristaları ve cafe görevlilerini tanımlayın, aktiflik durumlarını ve masa sorumluluklarını takip edin.
          </p>
        </div>

        <button
          onClick={() => {
            setAddError(null)
            setIsAddModalOpen(true)
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-98 shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Yeni Personel Ekle</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/20 dark:border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-foreground/50">Toplam Ekip</span>
            <span className="font-heading font-black text-2xl text-foreground mt-1">{displayedWaiters.length} Kişi</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/20 dark:border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-foreground/50">Vardiyada (Aktif)</span>
            <span className="font-heading font-black text-2xl text-emerald-500 mt-1">{activeCount} Kişi</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/20 dark:border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-foreground/50">Pasif / İzinli</span>
            <span className="font-heading font-black text-2xl text-rose-500 mt-1">{inactiveCount} Kişi</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Staff Members Grid */}
      {displayedWaiters.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/20 dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-black text-lg text-foreground">Kayıtlı Personel Bulunamadı</h3>
          <p className="text-xs text-foreground/60 max-w-sm">
            Henüz personel kaydı oluşturulmamış. Yukarıdaki butona tıklayarak ilk görevliyi ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedWaiters.map((staff) => {
            const assignedCount = Object.keys(tableAssignments).filter(tId =>
              (tableAssignments[tId] || []).includes(staff.name)
            ).length

            return (
              <div
                key={staff.id}
                className={`glass-panel p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                  staff.isActive
                    ? "border-white/20 dark:border-white/10 hover:border-primary/40"
                    : "bg-rose-500/5 border-rose-500/20 opacity-75"
                }`}
              >
                {/* Top Row: Avatar + Name + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-black text-lg shadow-sm ${staff.avatarColor}`}>
                      {staff.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-heading font-black text-base text-foreground flex items-center gap-2">
                        <span>{staff.name}</span>
                        {!staff.isActive && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                            Pasif
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-foreground/60 font-semibold mt-0.5">
                        <Coffee className="h-3.5 w-3.5 text-primary" />
                        <span>{staff.role === "barista" ? "Barista" : "Cafe Görevlisi"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => toggleWaiterActive(staff.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      staff.isActive
                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                        : "bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white"
                    }`}
                    title={staff.isActive ? "Hesabı dondur" : "Hesabı aktifleştir"}
                  >
                    {staff.isActive ? "Aktif" : "Pasif"}
                  </button>
                </div>

                {/* Bottom Row: Responsibility & Delete */}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60">
                  <span className="text-foreground/60 font-semibold">
                    Sorumlu Olduğu: <strong className="text-foreground">{assignedCount} Masa</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(staff)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Personeli Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Add New Staff */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-white/10 max-w-md w-full text-left flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="font-heading font-black text-lg text-foreground">Yeni Personel Tanımla</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl bg-card border border-border text-foreground/60 hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              {/* Staff Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground/70">Personel Adı</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Mehmet"
                  className="px-4 py-2.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              {/* Staff Role */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground/70">Görevi / Pozisyonu</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as WaiterProfile['role'])}
                  className="px-4 py-2.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-xs focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="barista">☕ Barista</option>
                  <option value="waiter">🧑‍🍳 Cafe Görevlisi</option>
                  <option value="manager">🛡️ Vardiya Müdürü</option>
                </select>
              </div>

              {/* Avatar Color Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground/70">Avatar Rengi</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-xl ${color} transition-all cursor-pointer flex items-center justify-center ${
                        selectedColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-80"
                      }`}
                    >
                      {selectedColor === color && "✓"}
                    </button>
                  ))}
                </div>
              </div>

              {addError && (
                <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-border text-foreground/70 hover:bg-muted font-bold text-xs cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md shadow-primary/20 cursor-pointer"
                >
                  Personeli Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
