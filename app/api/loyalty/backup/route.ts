import { NextRequest, NextResponse } from "next/server"
import { exportLoyaltyData } from "@/lib/data/loyalty-store"
import { verifyStaffSession } from "@/lib/security/auth-guard"

export async function GET(request: NextRequest) {
  try {
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Sadakat programı yedeği almak için görevli girişi yapınız." },
        { status: 401 }
      )
    }

    const backup = await exportLoyaltyData()
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `kontenyer_sadakat_yedegi_${dateStr}.json`

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0"
      }
    })
  } catch (error) {
    console.error("Loyalty backup GET error:", error)
    return NextResponse.json(
      { error: "Sadakat yedeği oluşturulurken bir hata meydana geldi." },
      { status: 500 }
    )
  }
}
