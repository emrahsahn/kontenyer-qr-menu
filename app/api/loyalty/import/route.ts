import { NextRequest, NextResponse } from "next/server"
import { validateLoyaltyBackup, importLoyaltyData } from "@/lib/data/loyalty-store"
import { verifyStaffSession } from "@/lib/security/auth-guard"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.data) {
      return NextResponse.json(
        { error: "İstek gövdesinde 'data' nesnesi bulunamadı." },
        { status: 400 }
      )
    }

    const { data, mode = "merge", dry_run = false } = body

    // 1. Validate payload schema
    const validation = validateLoyaltyBackup(data)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Yüklenen sadakat verisi geçerli şemaya uymuyor.",
          errors: validation.errors,
          warnings: validation.warnings,
          customerCount: validation.customerCount
        },
        { status: 400 }
      )
    }

    // 2. If dry run, return inspection preview without requiring write
    if (dry_run) {
      return NextResponse.json({
        valid: true,
        dry_run: true,
        customerCount: validation.customerCount,
        warnings: validation.warnings,
        message: `${validation.customerCount} kayıtlı müşteri başarıyla doğrulandı.`
      })
    }

    // 3. For actual writes, enforce staff session
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Sadakat verilerini geri yüklemek için görevli girişi yapınız." },
        { status: 401 }
      )
    }

    // 4. Execute actual import
    const cleanMode = mode === "replace" ? "replace" : "merge"
    const result = await importLoyaltyData(validation.data, cleanMode)

    return NextResponse.json({
      success: true,
      mode: cleanMode,
      customersCount: result.customersCount,
      message: `${validation.customerCount} müşteri kaydı sisteme başarıyla aktarıldı.`
    })
  } catch (error) {
    console.error("Loyalty import POST error:", error)
    return NextResponse.json(
      { error: "Sadakat verileri içe aktarılırken beklenmeyen bir hata oluştu." },
      { status: 500 }
    )
  }
}
