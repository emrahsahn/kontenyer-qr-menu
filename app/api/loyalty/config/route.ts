import { NextRequest, NextResponse } from "next/server"
import { getCampaignConfig, updateCampaignConfig } from "@/lib/data/loyalty-store"
import { verifyStaffSession } from "@/lib/security/auth-guard"

// GET: Publicly read active campaign configuration (targetStamps, scope, title, etc.)
export async function GET() {
  try {
    const config = await getCampaignConfig()
    return NextResponse.json({ config })
  } catch (error) {
    console.error("Loyalty config GET error:", error)
    return NextResponse.json(
      { error: "Kampanya yapılandırması alınamadı." },
      { status: 500 }
    )
  }
}

// PUT: Update campaign configuration (Staff Only)
export async function PUT(request: NextRequest) {
  try {
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Lütfen personel girişi yapınız." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Geçersiz istek verisi." },
        { status: 400 }
      )
    }

    const updated = await updateCampaignConfig(body)
    return NextResponse.json({
      success: true,
      config: updated,
      message: "Sadakat kampanyası ayarları başarıyla güncellendi."
    })
  } catch (error) {
    console.error("Loyalty config PUT error:", error)
    return NextResponse.json(
      { error: "Kampanya ayarları güncellenirken bir hata oluştu." },
      { status: 500 }
    )
  }
}
