import { NextRequest, NextResponse } from "next/server"
import { executeLoyaltyAction } from "@/lib/data/loyalty-store"
import { verifyStaffSession } from "@/lib/security/auth-guard"
import { LoyaltyActionType } from "@/lib/types/loyalty"

export async function POST(request: NextRequest) {
  try {
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Damga basmak veya hediye kullandırmak için lütfen personel girişi yapınız." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: "Geçersiz istek gövdesi." },
        { status: 400 }
      )
    }

    const { customerId, action } = body

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        { error: "Müşteri kimliği (customerId) belirtilmelidir." },
        { status: 400 }
      )
    }

    const validActions: LoyaltyActionType[] = ["STAMP_ADD", "STAMP_REMOVE", "REDEEM_FREE"]
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: "Geçersiz sadakat aksiyonu. Beklenen: STAMP_ADD, STAMP_REMOVE veya REDEEM_FREE" },
        { status: 400 }
      )
    }

    const result = await executeLoyaltyAction(customerId, action, auth.username || "barista")

    let message = "İşlem başarıyla tamamlandı."
    if (action === "STAMP_ADD") {
      message =
        result.customer.currentStamps === 0 && result.customer.freeCoffeesAvailable > result.log.previousFree
          ? `Tebrikler! Müşteri 1 Adet Hediye Kahve kazandı!`
          : `+1 Damga eklendi (${result.customer.currentStamps} damga).`
    } else if (action === "STAMP_REMOVE") {
      message = "Son işlem geri alındı."
    } else if (action === "REDEEM_FREE") {
      message = "1 Adet Hediye Kahve başarıyla kullandırıldı."
    }

    return NextResponse.json({
      success: true,
      customer: result.customer,
      log: result.log,
      message
    })
  } catch (error) {
    console.error("Loyalty action POST error:", error)
    const msg = error instanceof Error ? error.message : "İşlem gerçekleştirilemedi."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
