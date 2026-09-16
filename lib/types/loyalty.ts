export type LoyaltyScopeType = "all_drinks" | "categories" | "products"

export interface LoyaltyCampaignConfig {
  id: string
  title: string
  description: string
  targetStamps: number // E.g. 3, 4, 5 (Garson / Yönetici belirler)
  scopeType: LoyaltyScopeType
  categoryIds: string[]
  productIds: string[]
  rewardTitle: string
  isActive: boolean
  updatedAt: string
}

export interface LoyaltyCustomer {
  id: string
  phone: string // Normalized (e.g. "05321234567")
  fullName: string
  customerCode: string // Short code (e.g. "KNT-4821")
  currentStamps: number
  freeCoffeesAvailable: number
  totalStampsEarned: number
  totalFreeRedeemed: number
  kvkkConsent: boolean
  kvkkConsentAt: string
  createdAt: string
  updatedAt: string
}

export type LoyaltyActionType = "STAMP_ADD" | "STAMP_REMOVE" | "REDEEM_FREE"

export interface LoyaltyLog {
  id: string
  customerId: string
  action: LoyaltyActionType
  amount: number
  previousStamps: number
  newStamps: number
  previousFree: number
  newFree: number
  staffUsername: string
  createdAt: string
}

export interface LoyaltyStoreData {
  config: LoyaltyCampaignConfig
  customers: LoyaltyCustomer[]
  logs: LoyaltyLog[]
}
