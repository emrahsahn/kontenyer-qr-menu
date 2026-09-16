"use client"

import React from "react"
import { Product } from "@/lib/types/database"
import { useTable } from "@/lib/context/table-context"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  X,
  Layers,
  Clock,
  Star,
  Flame,
  Leaf,
  Snowflake,
  Coffee
} from "lucide-react"

export function ProductDetailDialog({
  product,
  isOpen,
  onClose
}: {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { lang, t } = useTable();
  const fallbackImg = "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&auto=format&fit=crop&q=80";
  const [imgError, setImgError] = React.useState(false);
  const [prevProductId, setPrevProductId] = React.useState<string | undefined>(product?.id);

  if (product?.id !== prevProductId) {
    setPrevProductId(product?.id);
    setImgError(false);
  }

  if (!product) return null;

  const ad = lang === 'tr' ? product.ad_tr : product.ad_en;
  const secondaryAd = lang === 'tr' ? product.ad_en : product.ad_tr;
  const aciklama = lang === 'tr' ? product.aciklama_tr : product.aciklama_en;
  
  const allergens = product.ozellikler?.alerjenler || [];
  const hasAllergens = allergens.length > 0;

  const isVegetarian = !!product.ozellikler?.vejetaryen;
  const isVegan = !!product.ozellikler?.vegan;
  const isSpicy = !!product.ozellikler?.acili;
  const isCold = !!product.ozellikler?.soğuk || !!product.ozellikler?.soguk;
  const hasCaffeine = !!product.ozellikler?.kafein;
  const isChefSpecial = !!product.ozellikler?.sef_onerisi;
  const prepTime = product.ozellikler?.hazirlama_suresi;

  const hasAnyBadges = isVegetarian || isVegan || isSpicy || isCold || hasCaffeine || isChefSpecial || !!prepTime;

  const portions = product.porsiyonlar || [];
  const hasPortions = portions.length > 0;

  const minPortionPrice = hasPortions
    ? Math.min(...portions.map(p => Number(p.fiyat) || 0))
    : Number(product.fiyat);

  const maxPortionPrice = hasPortions
    ? Math.max(...portions.map(p => Number(p.fiyat) || 0))
    : Number(product.fiyat);

  const imgSrc = (!imgError && product.gorsel_url) ? product.gorsel_url : fallbackImg;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] sm:w-[90vw] md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden border-border bg-card text-foreground rounded-3xl shadow-2xl max-h-[92vh] md:max-h-[85vh] md:h-[540px] lg:h-[580px] flex flex-col md:flex-row transition-all duration-300"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{ad}</DialogTitle>
        </DialogHeader>

        {/* --- LEFT / TOP: Product Image Visual Area --- */}
        <div className="relative w-full md:w-[46%] lg:w-[44%] aspect-[16/10] md:aspect-auto md:h-full shrink-0 bg-muted overflow-hidden group">
          <Image
            src={imgSrc}
            alt={ad}
            fill
            unoptimized
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgError(true)}
          />

          {/* Floating Badges Overlay (Top-Left) */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start">
            {isChefSpecial && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-black shadow-md backdrop-blur-md">
                <Star className="h-3.5 w-3.5 fill-black" />
                <span>{lang === 'tr' ? "Şefin Önerisi" : "Chef's Special"}</span>
              </span>
            )}
            {!product.aktif && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-destructive text-destructive-foreground shadow-md">
                {lang === 'tr' ? "Tükendi" : "Sold Out"}
              </span>
            )}
          </div>

          {/* Floating Mobile Close Button (Top-Right of Image, mobile only) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="md:hidden absolute top-3 right-3 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer border border-white/20 shadow-lg"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Subtle gradient overlay for image depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* --- RIGHT / BOTTOM: Content & Details Area --- */}
        <div className="w-full md:w-[54%] lg:w-[56%] flex flex-col justify-between overflow-hidden bg-card">
          
          {/* Desktop Top Header Bar (With Close Button) */}
          <div className="hidden md:flex items-center justify-between px-6 pt-5 pb-2 border-b border-border/50">
            <span className="text-[11px] font-black uppercase tracking-widest text-primary">
              Konteyner Cafe & Roastery
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 rounded-xl hover:bg-muted text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 no-scrollbar">
            
            {/* Title & English Subtitle */}
            <div className="flex flex-col gap-1">
              <h2 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl text-foreground tracking-tight leading-tight">
                {ad}
              </h2>
              {secondaryAd && secondaryAd !== ad && (
                <span className="text-xs sm:text-sm font-semibold text-foreground/50">
                  {secondaryAd}
                </span>
              )}
            </div>

            {/* Badges / Features Chips */}
            {hasAnyBadges && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {prepTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-foreground/85 border border-border">
                    <Clock className="h-3 w-3 text-primary" /> {prepTime}
                  </span>
                )}
                {isVegetarian && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <Leaf className="h-3 w-3 text-emerald-500" /> Vejetaryen
                  </span>
                )}
                {isVegan && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-600/15 text-green-600 dark:text-green-400 border border-green-600/30">
                    <Leaf className="h-3 w-3 text-green-500" /> Vegan
                  </span>
                )}
                {isSpicy && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <Flame className="h-3 w-3 text-rose-500" /> Acılı
                  </span>
                )}
                {isCold && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                    <Snowflake className="h-3 w-3 text-sky-500" /> Soğuk
                  </span>
                )}
                {hasCaffeine && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                    <Coffee className="h-3 w-3 text-orange-500" /> Kafeinli
                  </span>
                )}
              </div>
            )}

            {/* Description Text */}
            {aciklama && (
              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-medium">
                {aciklama}
              </p>
            )}

            {/* Portions & Size Options */}
            {hasPortions && (
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>{lang === 'tr' ? 'Porsiyon & Boyut Seçenekleri' : 'Portion & Size Options'}</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2">
                  {portions.map((portion) => {
                    const portionName = lang === 'tr' ? portion.ad_tr : (portion.ad_en || portion.ad_tr);

                    return (
                      <div
                        key={portion.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-secondary/60 dark:bg-muted/40 border border-border/80 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-xs font-extrabold text-foreground truncate">
                            {portionName}
                          </span>
                        </div>
                        <span className="font-sans font-black text-sm text-primary tabular-nums tracking-tight shrink-0 ml-2">
                          ₺{Number(portion.fiyat).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sold Out Notice */}
            {!product.aktif && (
              <div className="flex gap-2.5 p-3.5 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-xs items-center">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-bold">{t('soldOutDesc')}</span>
              </div>
            )}

            {/* Allergens Notice */}
            {hasAllergens && (
              <div className="flex gap-2.5 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs items-start">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold mr-1">{t('allergens')}:</span>
                  <span>{allergens.join(", ")}</span>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Bottom Footer Bar (Price + Action) */}
          <div className="p-4 sm:p-5 md:px-6 md:py-4 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-black">
                {hasPortions && minPortionPrice !== maxPortionPrice
                  ? (lang === 'tr' ? "FİYAT ARALIĞI" : "PRICE RANGE")
                  : (lang === 'tr' ? "FİYAT" : "PRICE")}
              </span>
              <span className="font-sans font-black text-xl sm:text-2xl text-primary tabular-nums tracking-tight">
                {hasPortions && minPortionPrice !== maxPortionPrice
                  ? `₺${minPortionPrice.toFixed(0)} - ₺${maxPortionPrice.toFixed(0)}`
                  : `₺${Number(product.fiyat).toFixed(2)}`}
              </span>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="px-6 py-4 rounded-2xl font-bold text-xs uppercase bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all cursor-pointer shadow-xs"
            >
              {lang === 'tr' ? "Menüye Dön" : "Back to Menu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
