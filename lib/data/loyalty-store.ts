import fs from "fs"
import path from "path"
import { Redis } from "@upstash/redis"
import {
  LoyaltyStoreData,
  LoyaltyCampaignConfig,
  LoyaltyCustomer,
  LoyaltyLog,
  LoyaltyActionType
} from "@/lib/types/loyalty"

const LOYALTY_FILE_PATH = path.join(process.cwd(), "data", "loyalty.json")
const REDIS_LOYALTY_KEY = "konteyner_loyalty_data_v1"
const MEMORY_CACHE_TTL_MS = 10000 // 10s memory cache

declare global {
  var __konteynerLoyaltyData: LoyaltyStoreData | undefined
  var __konteynerLoyaltyLastFetch: number | undefined
}

function getDefaultStore(): LoyaltyStoreData {
  return {
    config: {
      id: "default_campaign",
      title: "Konteyner Kahve Kulübü",
      description: "Seçili kahve ve içeceklerde damgaları topla, bir sonraki kahven bizden hediye!",
      targetStamps: 4,
      scopeType: "all_drinks",
      categoryIds: [],
      productIds: [],
      rewardTitle: "1 Adet Ücretsiz Kahve",
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    customers: [],
    logs: []
  }
}

function getLocalFileStore(): LoyaltyStoreData {
  try {
    if (fs.existsSync(LOYALTY_FILE_PATH)) {
      const fileData = fs.readFileSync(LOYALTY_FILE_PATH, "utf-8")
      const parsed = JSON.parse(fileData)
      if (parsed && parsed.config && Array.isArray(parsed.customers)) {
        return parsed as LoyaltyStoreData
      }
    }
  } catch (err) {
    console.warn("Notice: Local loyalty file read fallback error:", err)
  }
  return getDefaultStore()
}

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

  if (url && token && typeof url === "string" && !url.startsWith("redis://") && !url.startsWith("rediss://")) {
    try {
      return new Redis({ url, token })
    } catch (e) {
      console.warn("Notice: Upstash Redis client initialization skipped:", e)
    }
  }
  return null
}

export async function getLoyaltyStore(): Promise<LoyaltyStoreData> {
  const now = Date.now()

  // 0. Memory cache check
  if (
    globalThis.__konteynerLoyaltyData &&
    globalThis.__konteynerLoyaltyLastFetch &&
    now - globalThis.__konteynerLoyaltyLastFetch < MEMORY_CACHE_TTL_MS
  ) {
    return globalThis.__konteynerLoyaltyData
  }

  // 1. Upstash Redis
  const redis = getRedisClient()
  if (redis) {
    try {
      const data = await redis.get<LoyaltyStoreData | string>(REDIS_LOYALTY_KEY)
      if (data) {
        const store = typeof data === "string" ? JSON.parse(data) : data
        if (store && store.config && Array.isArray(store.customers)) {
          globalThis.__konteynerLoyaltyData = store
          globalThis.__konteynerLoyaltyLastFetch = now
          return store
        }
      }

      // If Redis is empty, auto-seed with local file
      const defaultData = getLocalFileStore()
      await redis.set(REDIS_LOYALTY_KEY, defaultData)
      globalThis.__konteynerLoyaltyData = defaultData
      globalThis.__konteynerLoyaltyLastFetch = now
      return defaultData
    } catch (err) {
      console.warn("Notice: Upstash Redis get loyalty error, using fallback:", err)
    }
  }

  // 2. Local File / Memory Fallback
  if (!globalThis.__konteynerLoyaltyData) {
    globalThis.__konteynerLoyaltyData = getLocalFileStore()
    globalThis.__konteynerLoyaltyLastFetch = now
  }
  return globalThis.__konteynerLoyaltyData
}

export async function persistLoyaltyStore(data: LoyaltyStoreData): Promise<boolean> {
  globalThis.__konteynerLoyaltyData = data
  globalThis.__konteynerLoyaltyLastFetch = Date.now()

  // 1. Upstash Redis
  const redis = getRedisClient()
  if (redis) {
    try {
      await redis.set(REDIS_LOYALTY_KEY, data)
    } catch (err) {
      console.warn("Notice: Upstash Redis set loyalty error:", err)
    }
  }

  // 2. Local File System
  try {
    const dir = path.dirname(LOYALTY_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(LOYALTY_FILE_PATH, JSON.stringify(data, null, 2), "utf-8")
  } catch {
    // Read-only filesystem in serverless environments
  }

  return true
}

// Normalize phone numbers (e.g. "+90 532 123 45 67" -> "05321234567")
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("90") && cleaned.length === 12) {
    cleaned = "0" + cleaned.substring(2)
  } else if (!cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "0" + cleaned
  }
  return cleaned
}

// Generate unique short code like "KNT-4821"
function generateCustomerCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000).toString()
  return `KNT-${digits}`
}

export async function getCampaignConfig(): Promise<LoyaltyCampaignConfig> {
  const store = await getLoyaltyStore()
  return store.config
}

export async function updateCampaignConfig(
  updates: Partial<LoyaltyCampaignConfig>
): Promise<LoyaltyCampaignConfig> {
  const store = await getLoyaltyStore()
  const updatedConfig: LoyaltyCampaignConfig = {
    ...store.config,
    ...updates,
    targetStamps: Math.max(2, Math.min(12, Number(updates.targetStamps ?? store.config.targetStamps) || 4)),
    updatedAt: new Date().toISOString()
  }

  store.config = updatedConfig
  await persistLoyaltyStore(store)
  return updatedConfig
}

export async function getAllCustomers(): Promise<LoyaltyCustomer[]> {
  const store = await getLoyaltyStore()
  return [...store.customers].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  )
}

export async function getCustomerById(id: string): Promise<LoyaltyCustomer | null> {
  const store = await getLoyaltyStore()
  return store.customers.find((c) => c.id === id) || null
}

export async function findCustomer(query: string): Promise<LoyaltyCustomer[]> {
  const store = await getLoyaltyStore()
  const cleanQ = query.trim().toLowerCase()
  const cleanPhone = cleanQ.replace(/\D/g, "")

  if (!cleanQ) return []

  return store.customers.filter((c) => {
    const matchName = c.fullName.toLowerCase().includes(cleanQ)
    const matchCode = c.customerCode.toLowerCase().includes(cleanQ)
    const matchPhone = cleanPhone && c.phone.includes(cleanPhone)
    return matchName || matchCode || matchPhone
  })
}

export async function registerCustomer(
  fullName: string,
  rawPhone: string,
  kvkkConsent: boolean
): Promise<LoyaltyCustomer> {
  if (!fullName.trim()) {
    throw new Error("Lütfen ad ve soyadınızı giriniz.")
  }
  const phone = normalizePhone(rawPhone)
  if (phone.length < 10) {
    throw new Error("Lütfen geçerli bir telefon numarası giriniz (örn: 05xx xxx xx xx).")
  }
  if (!kvkkConsent) {
    throw new Error("Sadakat programından faydalanabilmek için KVKK Aydınlatma Metni'ni onaylamanız gerekmektedir.")
  }

  const store = await getLoyaltyStore()
  // Check if phone already registered
  const existing = store.customers.find((c) => c.phone === phone)
  if (existing) {
    // Preserve existing customer's original registered name; do not overwrite with foreign input
    if (!existing.fullName) {
      existing.fullName = fullName.trim()
    }
    existing.kvkkConsent = true
    existing.updatedAt = new Date().toISOString()
    await persistLoyaltyStore(store)
    return existing
  }

  // Create new customer
  let customerCode = generateCustomerCode()
  while (store.customers.some((c) => c.customerCode === customerCode)) {
    customerCode = generateCustomerCode()
  }

  const newCustomer: LoyaltyCustomer = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    phone,
    fullName: fullName.trim(),
    customerCode,
    currentStamps: 0,
    freeCoffeesAvailable: 0,
    totalStampsEarned: 0,
    totalFreeRedeemed: 0,
    kvkkConsent: true,
    kvkkConsentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  store.customers.unshift(newCustomer)
  await persistLoyaltyStore(store)
  return newCustomer
}

export async function updateCustomer(
  customerId: string,
  data: { fullName: string; phone: string }
): Promise<LoyaltyCustomer> {
  const store = await getLoyaltyStore()
  const customer = store.customers.find((c) => c.id === customerId)
  if (!customer) {
    throw new Error("Müşteri bulunamadı.")
  }

  const cleanName = data.fullName.trim()
  if (!cleanName) {
    throw new Error("Lütfen geçerli bir ad soyad giriniz.")
  }

  const cleanPhone = normalizePhone(data.phone)
  if (cleanPhone.length < 10) {
    throw new Error("Lütfen geçerli bir telefon numarası giriniz (örn: 05xx xxx xx xx).")
  }

  // Check if another customer already has this phone number
  const phoneConflict = store.customers.find(
    (c) => c.id !== customerId && c.phone === cleanPhone
  )
  if (phoneConflict) {
    throw new Error(`Bu telefon numarası zaten '${phoneConflict.fullName}' (#${phoneConflict.customerCode}) adına kayıtlıdır.`)
  }

  customer.fullName = cleanName
  customer.phone = cleanPhone
  customer.updatedAt = new Date().toISOString()

  await persistLoyaltyStore(store)
  return customer
}

export async function executeLoyaltyAction(
  customerId: string,
  action: LoyaltyActionType,
  staffUsername: string = "barista"
): Promise<{ customer: LoyaltyCustomer; log: LoyaltyLog }> {
  const store = await getLoyaltyStore()
  const customer = store.customers.find((c) => c.id === customerId)

  if (!customer) {
    throw new Error("Müşteri kartı bulunamadı.")
  }

  const targetStamps = store.config.targetStamps || 4
  const prevStamps = customer.currentStamps
  const prevFree = customer.freeCoffeesAvailable

  let newStamps = prevStamps
  let newFree = prevFree

  if (action === "STAMP_ADD") {
    newStamps = prevStamps + 1
    customer.totalStampsEarned += 1

    // If reached target, grant 1 free coffee and reset current stamps to 0
    if (newStamps >= targetStamps) {
      newFree += 1
      newStamps = 0
    }
  } else if (action === "STAMP_REMOVE") {
    if (newStamps > 0) {
      newStamps -= 1
      customer.totalStampsEarned = Math.max(0, customer.totalStampsEarned - 1)
    } else if (newFree > 0) {
      // Revert from free coffee back to targetStamps - 1
      newFree -= 1
      newStamps = targetStamps - 1
      customer.totalStampsEarned = Math.max(0, customer.totalStampsEarned - 1)
    } else {
      throw new Error("Geri alınacak damga veya hediye bulunmuyor.")
    }
  } else if (action === "REDEEM_FREE") {
    if (newFree <= 0) {
      throw new Error("Müşterinin kullanılabilir hediye kahvesi bulunmuyor.")
    }
    newFree -= 1
    customer.totalFreeRedeemed += 1
  }

  customer.currentStamps = newStamps
  customer.freeCoffeesAvailable = newFree
  customer.updatedAt = new Date().toISOString()

  const log: LoyaltyLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    customerId,
    action,
    amount: 1,
    previousStamps: prevStamps,
    newStamps,
    previousFree: prevFree,
    newFree,
    staffUsername,
    createdAt: new Date().toISOString()
  }

  store.logs.unshift(log)
  // Keep logs at max 500 entries
  if (store.logs.length > 500) {
    store.logs = store.logs.slice(0, 500)
  }

  await persistLoyaltyStore(store)
  return { customer, log }
}

export async function deleteCustomer(customerId: string): Promise<boolean> {
  const store = await getLoyaltyStore()
  const initialCount = store.customers.length
  store.customers = store.customers.filter((c) => c.id !== customerId)

  if (store.customers.length === initialCount) {
    return false
  }

  // KVKK compliance: clean up historical action logs for deleted customer
  store.logs = store.logs.filter((l) => l.customerId !== customerId)

  await persistLoyaltyStore(store)
  return true
}

export interface LoyaltyBackupData {
  version: "1.0"
  exportedAt: string
  campaign?: LoyaltyCampaignConfig
  customers: LoyaltyCustomer[]
  logsCount: number
}

export async function exportLoyaltyData(): Promise<LoyaltyBackupData> {
  const store = await getLoyaltyStore()
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    campaign: store.config,
    customers: store.customers,
    logsCount: store.logs.length
  }
}

export interface LoyaltyValidationResult {
  valid: boolean
  customerCount: number
  errors: string[]
  warnings: string[]
  data?: LoyaltyBackupData
}

export function validateLoyaltyBackup(raw: unknown): LoyaltyValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!raw || typeof raw !== "object") {
    return { valid: false, customerCount: 0, errors: ["Yüklenen veri geçerli bir JSON nesnesi değil."], warnings }
  }

  const obj = raw as Record<string, unknown>
  let customersRaw: unknown[] = []

  if (Array.isArray(obj.customers)) {
    customersRaw = obj.customers
  } else if (Array.isArray(raw)) {
    customersRaw = raw
  } else {
    errors.push("'customers' müşteri listesi dizisi bulunamadı.")
    return { valid: false, customerCount: 0, errors, warnings }
  }

  const validCustomers: LoyaltyCustomer[] = []
  const seenPhones = new Set<string>()

  for (let i = 0; i < customersRaw.length; i++) {
    const item = customersRaw[i] as Record<string, unknown>
    if (!item || typeof item !== "object") {
      errors.push(`${i + 1}. sıradaki müşteri nesnesi geçersiz.`)
      continue
    }

    if (!item.fullName || typeof item.fullName !== "string") {
      errors.push(`${i + 1}. müşterinin adı (fullName) eksik.`)
    }
    if (!item.phone || typeof item.phone !== "string") {
      errors.push(`${i + 1}. müşterinin telefon numarası eksik.`)
    }

    const phoneDigits = String(item.phone || "").replace(/\D/g, "")
    if (phoneDigits.length < 10) {
      warnings.push(`"${item.fullName || i + 1}" müşterisinin telefon numarası 10 haneden kısa görünüyor.`)
    }

    if (seenPhones.has(phoneDigits)) {
      warnings.push(`Mükerrer telefon tespit edildi: ${phoneDigits}.`)
    }
    seenPhones.add(phoneDigits)

    const normalizedPhone = phoneDigits.startsWith("0") ? phoneDigits : "0" + phoneDigits

    const customer: LoyaltyCustomer = {
      id: typeof item.id === "string" && item.id ? item.id : `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      phone: normalizedPhone,
      fullName: String(item.fullName || "İsimsiz Müşteri").trim(),
      customerCode: typeof item.customerCode === "string" && item.customerCode ? item.customerCode : `KNT-${Math.floor(1000 + Math.random() * 9000)}`,
      currentStamps: typeof item.currentStamps === "number" ? Math.max(0, item.currentStamps) : 0,
      freeCoffeesAvailable: typeof item.freeCoffeesAvailable === "number" ? Math.max(0, item.freeCoffeesAvailable) : 0,
      totalStampsEarned: typeof item.totalStampsEarned === "number" ? Math.max(0, item.totalStampsEarned) : 0,
      totalFreeRedeemed: typeof item.totalFreeRedeemed === "number" ? Math.max(0, item.totalFreeRedeemed) : 0,
      kvkkConsent: true,
      kvkkConsentAt: typeof item.kvkkConsentAt === "string" ? item.kvkkConsentAt : new Date().toISOString(),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString()
    }

    validCustomers.push(customer)
  }

  if (errors.length > 0) {
    return { valid: false, customerCount: validCustomers.length, errors, warnings }
  }

  const campaign =
    obj.campaign && typeof obj.campaign === "object"
      ? (obj.campaign as LoyaltyCampaignConfig)
      : undefined

  return {
    valid: true,
    customerCount: validCustomers.length,
    errors: [],
    warnings,
    data: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      campaign,
      customers: validCustomers,
      logsCount: 0
    }
  }
}

export async function importLoyaltyData(
  backupData: LoyaltyBackupData,
  mode: "merge" | "replace" = "merge"
): Promise<{ customersCount: number }> {
  const store = await getLoyaltyStore()

  if (backupData.campaign && typeof backupData.campaign === "object") {
    if (backupData.campaign.targetStamps) {
      store.config = {
        ...store.config,
        ...backupData.campaign,
        updatedAt: new Date().toISOString()
      }
    }
  }

  if (mode === "replace") {
    store.customers = backupData.customers
  } else {
    const map = new Map<string, LoyaltyCustomer>()
    for (const c of store.customers) {
      map.set(c.phone, c)
    }
    for (const incoming of backupData.customers) {
      const existing = map.get(incoming.phone)
      if (existing) {
        existing.fullName = incoming.fullName || existing.fullName
        existing.currentStamps = incoming.currentStamps
        existing.freeCoffeesAvailable = incoming.freeCoffeesAvailable
        existing.totalStampsEarned = Math.max(existing.totalStampsEarned, incoming.totalStampsEarned)
        existing.totalFreeRedeemed = Math.max(existing.totalFreeRedeemed, incoming.totalFreeRedeemed)
        existing.updatedAt = new Date().toISOString()
      } else {
        map.set(incoming.phone, incoming)
      }
    }
    store.customers = Array.from(map.values())
  }

  await persistLoyaltyStore(store)
  return { customersCount: store.customers.length }
}
