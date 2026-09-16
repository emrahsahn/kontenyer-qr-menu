import fs from "fs"
import path from "path"
import { Category, Product } from "@/lib/types/database"
import { Redis } from "@upstash/redis"
import { createClient } from "@/lib/supabase/server"

export interface MenuStoreData {
  categories: Category[];
  products: Product[];
}

const MENU_FILE_PATH = path.join(process.cwd(), "data", "menu.json")

// Global in-memory cache across requests & serverless hot-reloads
declare global {
  var __konteynerMenuData: MenuStoreData | undefined;
  var __konteynerMenuLastFetch: number | undefined;
}

const MEMORY_CACHE_TTL_MS = 15000 // 15 seconds memory cache protects Redis from rapid bursts

function getLocalFileDefaults(): MenuStoreData {
  try {
    if (fs.existsSync(MENU_FILE_PATH)) {
      const fileContent = fs.readFileSync(MENU_FILE_PATH, "utf-8")
      const parsed = JSON.parse(fileContent)
      if (parsed.categories && parsed.products) {
        return parsed
      }
    }
  } catch (error) {
    console.warn("Could not read menu.json from disk, using fallback:", error)
  }

  return {
    categories: [],
    products: []
  }
}

// Initialize Upstash Redis client with any Vercel/Upstash environment variable names
function getRedisClient(): Redis | null {
  let url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.STORAGE_URL

  let token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN

  // Scan process.env for custom Vercel Store prefixes (e.g. KONTENYER_KV_REST_API_URL, YALI_KV_REST_API_URL, etc.)
  if (!url || !token) {
    for (const key of Object.keys(process.env)) {
      if (!url && (key.endsWith("_KV_REST_API_URL") || key.endsWith("_REST_API_URL"))) {
        url = process.env[key]
      }
      if (!token && (key.endsWith("_KV_REST_API_TOKEN") || key.endsWith("_REST_API_TOKEN"))) {
        token = process.env[key]
      }
    }
  }

  // Ensure url is a valid HTTPS REST endpoint (not redis:// TCP protocol)
  if (url && token && typeof url === "string") {
    // If user or provider supplied redis:// or rediss://, log note since @upstash/redis requires REST
    if (url.startsWith("redis://") || url.startsWith("rediss://")) {
      console.warn("Notice: Upstash REST client requires HTTPS URL, found TCP redis URL:", url.split("@")[1] || url)
      return null
    }

    try {
      return new Redis({ url, token })
    } catch (e) {
      console.warn("Notice: Upstash Redis client initialization skipped:", e)
    }
  }
  return null
}


export async function getMenuStore(): Promise<MenuStoreData> {
  const now = Date.now()

  // 0. Return from in-memory cache if fresh (avoids redundant Redis network calls)
  if (
    globalThis.__konteynerMenuData &&
    globalThis.__konteynerMenuLastFetch &&
    now - globalThis.__konteynerMenuLastFetch < MEMORY_CACHE_TTL_MS &&
    globalThis.__konteynerMenuData.products.length > 0
  ) {
    return globalThis.__konteynerMenuData
  }

  const redis = getRedisClient()

  // 1. Upstash Redis (Vercel KV)
  if (redis) {
    try {
      const data = await redis.get<MenuStoreData | string>("konteyner_menu_data_v1")
      if (data) {
        const parsed = typeof data === "string" ? JSON.parse(data) : data
        if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.products) && parsed.products.length > 0) {
          globalThis.__konteynerMenuData = parsed
          globalThis.__konteynerMenuLastFetch = now
          return parsed
        }
      }
      // If Redis is fresh and empty, auto-seed with local initial menu data
      const defaultData = getLocalFileDefaults()
      if (defaultData.products.length > 0) {
        await redis.set("konteyner_menu_data_v1", defaultData)
        globalThis.__konteynerMenuData = defaultData
        globalThis.__konteynerMenuLastFetch = now
        return defaultData
      }
    } catch (err) {
      console.warn("Notice: Upstash Redis get error, using fallback:", err)
    }
  }

  // 2. Supabase if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isSupabaseConfigured = supabaseUrl && supabaseUrl !== "your-supabase-url"
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient()
      if (supabase) {
        const [catRes, prodRes] = await Promise.all([
          supabase.from("categories").select("*").order("sira", { ascending: true }),
          supabase.from("products").select("*").order("created_at", { ascending: false })
        ])

        if (catRes.data && prodRes.data && catRes.data.length > 0) {
          const store: MenuStoreData = {
            categories: catRes.data as Category[],
            products: prodRes.data as Product[]
          }
          globalThis.__konteynerMenuData = store
          return store
        }
      }
    } catch (e) {
      console.warn("Supabase fetch error, falling back to memory/file:", e)
    }
  }

  // 3. Local file / In-memory fallback
  if (!globalThis.__konteynerMenuData) {
    globalThis.__konteynerMenuData = getLocalFileDefaults()
  }
  return globalThis.__konteynerMenuData
}

export async function persistMenuStore(data: MenuStoreData): Promise<boolean> {
  globalThis.__konteynerMenuData = data
  globalThis.__konteynerMenuLastFetch = Date.now()

  // 1. Save to Upstash Redis
  const redis = getRedisClient()
  if (redis) {
    try {
      await redis.set("konteyner_menu_data_v1", data)
    } catch (err) {
      console.warn("Notice: Upstash Redis set error:", err)
    }
  }

  // 2. Save to local disk (if file system is writable)
  try {
    const dir = path.dirname(MENU_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(data, null, 2), "utf-8")
  } catch {
    // Expected on serverless / read-only filesystem
  }

  return true
}

export async function getProducts(includeInactive = true): Promise<Product[]> {
  const store = await getMenuStore()
  if (includeInactive) {
    return store.products
  }
  return store.products.filter((p) => p.aktif !== false)
}

export async function getCategories(): Promise<Category[]> {
  const store = await getMenuStore()
  return [...store.categories].sort((a, b) => a.sira - b.sira)
}

export async function saveProduct(productData: Partial<Product>): Promise<Product> {
  const store = await getMenuStore()
  let product: Product

  if (productData.id) {
    const index = store.products.findIndex((p) => p.id === productData.id)
    if (index !== -1) {
      product = {
        ...store.products[index],
        ...productData,
        fiyat: Number(productData.fiyat ?? store.products[index].fiyat)
      }
      store.products[index] = product
    } else {
      product = {
        id: productData.id,
        kategori_id: productData.kategori_id || store.categories[0]?.id || "cat-1",
        ad_tr: productData.ad_tr || "Yeni Ürün",
        ad_en: productData.ad_en || "New Product",
        aciklama_tr: productData.aciklama_tr || "",
        aciklama_en: productData.aciklama_en || "",
        fiyat: Number(productData.fiyat || 0),
        gorsel_url: productData.gorsel_url || "",
        ozellikler: productData.ozellikler || {},
        aktif: productData.aktif !== false,
        created_at: new Date().toISOString(),
        ...productData
      }
      store.products.push(product)
    }
  } else {
    product = {
      id: "prod-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      kategori_id: productData.kategori_id || store.categories[0]?.id || "cat-1",
      ad_tr: productData.ad_tr || "Yeni Ürün",
      ad_en: productData.ad_en || "New Product",
      aciklama_tr: productData.aciklama_tr || "",
      aciklama_en: productData.aciklama_en || "",
      fiyat: Number(productData.fiyat || 0),
      porsiyonlar: productData.porsiyonlar,
      gorsel_url: productData.gorsel_url || "",
      ozellikler: productData.ozellikler || {},
      aktif: productData.aktif !== false,
      created_at: new Date().toISOString(),
      ...productData
    }
    store.products.push(product)
  }

  // Also sync to Supabase if configured
  try {
    const supabase = await createClient()
    if (supabase) {
      await supabase.from("products").upsert({
        id: product.id,
        kategori_id: product.kategori_id,
        ad_tr: product.ad_tr,
        ad_en: product.ad_en,
        aciklama_tr: product.aciklama_tr,
        aciklama_en: product.aciklama_en,
        fiyat: product.fiyat,
        gorsel_url: product.gorsel_url,
        ozellikler: product.ozellikler,
        aktif: product.aktif
      })
    }
  } catch {}

  await persistMenuStore(store)
  return product
}

export async function toggleProductActive(productId: string): Promise<Product | null> {
  const store = await getMenuStore()
  const product = store.products.find((p) => p.id === productId)
  if (!product) return null

  product.aktif = !product.aktif

  // Also sync to Supabase if configured
  try {
    const supabase = await createClient()
    if (supabase) {
      await supabase.from("products").update({ aktif: product.aktif }).eq("id", productId)
    }
  } catch {}

  await persistMenuStore(store)
  return product
}

export async function deleteProduct(productId: string): Promise<boolean> {
  const store = await getMenuStore()
  const initialLength = store.products.length
  store.products = store.products.filter((p) => p.id !== productId)

  if (store.products.length !== initialLength) {
    // Also sync to Supabase if configured
    try {
      const supabase = await createClient()
      if (supabase) {
        await supabase.from("products").delete().eq("id", productId)
      }
    } catch {}

    await persistMenuStore(store)
    return true
  }
  return false
}

export async function saveCategory(categoryData: Partial<Category>): Promise<Category> {
  const store = await getMenuStore()
  let category: Category

  if (categoryData.id) {
    const index = store.categories.findIndex((c) => c.id === categoryData.id)
    if (index !== -1) {
      category = {
        ...store.categories[index],
        ...categoryData
      }
      store.categories[index] = category
    } else {
      category = {
        id: categoryData.id,
        ad_tr: categoryData.ad_tr || "Yeni Kategori",
        ad_en: categoryData.ad_en || "New Category",
        sira: categoryData.sira ?? store.categories.length + 1,
        created_at: new Date().toISOString()
      }
      store.categories.push(category)
    }
  } else {
    category = {
      id: "cat-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      ad_tr: categoryData.ad_tr || "Yeni Kategori",
      ad_en: categoryData.ad_en || "New Category",
      sira: categoryData.sira ?? store.categories.length + 1,
      created_at: new Date().toISOString()
    }
    store.categories.push(category)
  }

  // Also sync to Supabase if configured
  try {
    const supabase = await createClient()
    if (supabase) {
      await supabase.from("categories").upsert({
        id: category.id,
        ad_tr: category.ad_tr,
        ad_en: category.ad_en,
        sira: category.sira
      })
    }
  } catch {}

  await persistMenuStore(store)
  return category
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  const store = await getMenuStore()
  const initialLength = store.categories.length
  store.categories = store.categories.filter((c) => c.id !== categoryId)

  if (store.categories.length !== initialLength) {
    store.products = store.products.filter((p) => p.kategori_id !== categoryId)

    // Also sync to Supabase if configured
    try {
      const supabase = await createClient()
      if (supabase) {
        await supabase.from("categories").delete().eq("id", categoryId)
        await supabase.from("products").delete().eq("kategori_id", categoryId)
      }
    } catch {}

    await persistMenuStore(store)
    return true
  }
  return false
}

export interface MenuBackupData {
  version: string;
  system: string;
  exported_at: string;
  categories: Category[];
  products: Product[];
}

export interface MenuValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  categoryCount: number;
  productCount: number;
  data?: MenuBackupData;
}

/**
 * Exports current menu as a standardized backup JSON
 */
export async function exportMenuData(): Promise<MenuBackupData> {
  const store = await getMenuStore()
  return {
    version: "1.0",
    system: "kontenyer-cafe-menu",
    exported_at: new Date().toISOString(),
    categories: [...store.categories].sort((a, b) => a.sira - b.sira),
    products: [...store.products]
  }
}

/**
 * Validates a candidate menu backup object against schema requirements
 */
export function validateMenuBackup(raw: unknown): MenuValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!raw || typeof raw !== "object") {
    return {
      valid: false,
      errors: ["Geçersiz JSON verisi. Dosya içeriği bir JSON nesnesi olmalıdır."],
      warnings,
      categoryCount: 0,
      productCount: 0
    }
  }

  const obj = raw as Record<string, unknown>

  if (!Array.isArray(obj.categories)) {
    errors.push("Kategoriler listesi ('categories') eksik veya bir dizi (array) değil.")
  }

  if (!Array.isArray(obj.products)) {
    errors.push("Ürünler listesi ('products') eksik veya bir dizi (array) değil.")
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      categoryCount: Array.isArray(obj.categories) ? obj.categories.length : 0,
      productCount: Array.isArray(obj.products) ? obj.products.length : 0
    }
  }

  const rawCategories = obj.categories as unknown[]
  const rawProducts = obj.products as unknown[]

  const categoryIds = new Set<string>()

  // Validate Categories
  rawCategories.forEach((cat, idx) => {
    if (!cat || typeof cat !== "object") {
      errors.push(`Kategori #${idx + 1} geçerli bir nesne değil.`)
      return
    }
    const c = cat as Record<string, unknown>
    if (!c.id || typeof c.id !== "string" || !c.id.trim()) {
      errors.push(`Kategori #${idx + 1} için zorunlu 'id' alanı eksik.`)
    } else {
      categoryIds.add(c.id.trim())
    }
    if (!c.ad_tr || typeof c.ad_tr !== "string" || !c.ad_tr.trim()) {
      errors.push(`Kategori '${c.id || idx + 1}' için zorunlu 'ad_tr' (Türkçe ad) alanı eksik.`)
    }
  })

  // Validate Products
  rawProducts.forEach((prod, idx) => {
    if (!prod || typeof prod !== "object") {
      errors.push(`Ürün #${idx + 1} geçerli bir nesne değil.`)
      return
    }
    const p = prod as Record<string, unknown>
    const prodId = typeof p.id === "string" ? p.id.trim() : `Ürün #${idx + 1}`

    if (!p.id || typeof p.id !== "string" || !p.id.trim()) {
      errors.push(`Ürün #${idx + 1} için zorunlu 'id' alanı eksik.`)
    }

    if (!p.ad_tr || typeof p.ad_tr !== "string" || !p.ad_tr.trim()) {
      errors.push(`'${prodId}' için zorunlu 'ad_tr' (Türkçe ad) eksik.`)
    }

    if (p.fiyat === undefined || p.fiyat === null || isNaN(Number(p.fiyat)) || Number(p.fiyat) < 0) {
      errors.push(`'${prodId}' için geçerli bir 'fiyat' (0 veya pozitif sayı) girilmelidir.`)
    }

    if (!p.kategori_id || typeof p.kategori_id !== "string") {
      errors.push(`'${prodId}' için zorunlu 'kategori_id' alanı eksik.`)
    } else if (categoryIds.size > 0 && !categoryIds.has(p.kategori_id)) {
      warnings.push(`'${prodId}' için tanımlı '${p.kategori_id}' kategori kimliği, kategori listesinde bulunamadı.`)
    }
  })

  const valid = errors.length === 0

  return {
    valid,
    errors,
    warnings,
    categoryCount: rawCategories.length,
    productCount: rawProducts.length,
    data: valid ? (raw as MenuBackupData) : undefined
  }
}

/**
 * Imports menu backup data in either 'replace' (clean restore) or 'merge' mode
 */
export async function importMenuData(
  backup: MenuBackupData,
  mode: "replace" | "merge" = "replace"
): Promise<{ success: boolean; categoriesCount: number; productsCount: number }> {
  const currentStore = await getMenuStore()
  let finalStore: MenuStoreData

  if (mode === "replace") {
    finalStore = {
      categories: backup.categories.map((c, i) => ({
        ...c,
        sira: typeof c.sira === "number" ? c.sira : i + 1,
        created_at: c.created_at || new Date().toISOString()
      })),
      products: backup.products.map((p) => ({
        ...p,
        fiyat: Number(p.fiyat) || 0,
        aktif: p.aktif !== false,
        created_at: p.created_at || new Date().toISOString()
      }))
    }
  } else {
    // Merge mode: Upsert categories
    const categoryMap = new Map<string, Category>()
    currentStore.categories.forEach((c) => categoryMap.set(c.id, { ...c }))
    backup.categories.forEach((c, idx) => {
      categoryMap.set(c.id, {
        id: c.id,
        ad_tr: c.ad_tr || categoryMap.get(c.id)?.ad_tr || "Kategori",
        ad_en: c.ad_en || categoryMap.get(c.id)?.ad_en || "",
        sira: typeof c.sira === "number" ? c.sira : (categoryMap.get(c.id)?.sira ?? idx + 1),
        created_at: categoryMap.get(c.id)?.created_at || new Date().toISOString()
      })
    })

    // Upsert products
    const productMap = new Map<string, Product>()
    currentStore.products.forEach((p) => productMap.set(p.id, { ...p }))
    backup.products.forEach((p) => {
      productMap.set(p.id, {
        ...productMap.get(p.id),
        ...p,
        fiyat: Number(p.fiyat) || (productMap.get(p.id)?.fiyat ?? 0),
        aktif: p.aktif !== false,
        created_at: productMap.get(p.id)?.created_at || new Date().toISOString()
      })
    })

    finalStore = {
      categories: Array.from(categoryMap.values()).sort((a, b) => a.sira - b.sira),
      products: Array.from(productMap.values())
    }
  }

  // Persist across RAM cache, Upstash Redis & local filesystem
  await persistMenuStore(finalStore)

  // Optional: Sync to Supabase if configured
  try {
    const supabase = await createClient()
    if (supabase) {
      if (mode === "replace") {
        await supabase.from("products").delete().neq("id", "")
        await supabase.from("categories").delete().neq("id", "")
      }
      if (finalStore.categories.length > 0) {
        await supabase.from("categories").upsert(
          finalStore.categories.map((c) => ({
            id: c.id,
            ad_tr: c.ad_tr,
            ad_en: c.ad_en,
            sira: c.sira
          }))
        )
      }
      if (finalStore.products.length > 0) {
        await supabase.from("products").upsert(
          finalStore.products.map((p) => ({
            id: p.id,
            kategori_id: p.kategori_id,
            ad_tr: p.ad_tr,
            ad_en: p.ad_en,
            aciklama_tr: p.aciklama_tr,
            aciklama_en: p.aciklama_en,
            fiyat: p.fiyat,
            porsiyonlar: p.porsiyonlar,
            gorsel_url: p.gorsel_url,
            ozellikler: p.ozellikler,
            aktif: p.aktif
          }))
        )
      }
    }
  } catch (err) {
    console.warn("Supabase import sync notice:", err)
  }

  return {
    success: true,
    categoriesCount: finalStore.categories.length,
    productsCount: finalStore.products.length
  }
}

/**
 * Returns a template JSON for quick onboarding or empty setup
 */
export function getMenuTemplate(): MenuBackupData {
  return {
    version: "1.0",
    system: "kontenyer-cafe-menu",
    exported_at: new Date().toISOString(),
    categories: [
      {
        id: "cat-kahveler",
        ad_tr: "Sıcak & Soğuk Kahveler",
        ad_en: "Hot & Iced Coffees",
        sira: 1,
        created_at: new Date().toISOString()
      },
      {
        id: "cat-tatlilar",
        ad_tr: "Fırından & Tatlılar",
        ad_en: "Bakery & Desserts",
        sira: 2,
        created_at: new Date().toISOString()
      }
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
        ozellikler: {
          alerjenler: [],
          hazirlama_suresi: "3 dk",
          kafein: true,
          sef_onerisi: true
        },
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
        ozellikler: {
          alerjenler: ["Süt / Laktoz", "Yumurta"],
          hazirlama_suresi: "2 dk",
          vejetaryen: true,
          sef_onerisi: true
        },
        aktif: true,
        created_at: new Date().toISOString()
      }
    ]
  }
}
