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
    // Update name or consent timestamp if needed and return
    existing.fullName = fullName.trim()
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
