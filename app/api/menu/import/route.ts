import { NextRequest, NextResponse } from "next/server"
import { validateMenuBackup, importMenuData } from "@/lib/data/menu-store"
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

    const { data, mode = "replace", dry_run = false } = body

    // 1. Validate payload schema
    const validation = validateMenuBackup(data)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Yüklenen menü verisi geçerli şemaya uymuyor.",
          errors: validation.errors,
          warnings: validation.warnings,
          categoryCount: validation.categoryCount,
          productCount: validation.productCount
        },
        { status: 400 }
      )
    }

    // 2. If dry run, return inspection preview without requiring write session
    if (dry_run) {
      return NextResponse.json({
        valid: true,
        dry_run: true,
        categoryCount: validation.categoryCount,
        productCount: validation.productCount,
        warnings: validation.warnings,
        message: `${validation.categoryCount} kategori ve ${validation.productCount} ürün başarıyla doğrulandı.`
      })
    }

    // 3. For actual database writes, enforce staff authentication
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Menüyü sisteme kaydetmek için lütfen görevli girişi yapınız." },
        { status: 401 }
      )
    }

    // 3. Execute actual import
    const cleanMode = mode === "merge" ? "merge" : "replace"
    const result = await importMenuData(validation.data, cleanMode)

    return NextResponse.json({
      success: true,
      mode: cleanMode,
      categoriesCount: result.categoriesCount,
      productsCount: result.productsCount,
      warnings: validation.warnings,
      message:
        cleanMode === "replace"
          ? `Menü başarıyla sıfırlandı ve ${result.productsCount} ürün, ${result.categoriesCount} kategori yüklendi.`
          : `Menü başarıyla güncellendi (${result.productsCount} ürün, ${result.categoriesCount} kategori).`
    })
  } catch (error) {
    console.error("Menu import POST error:", error)
    return NextResponse.json(
      { error: "Menü içeri aktarılırken beklenmeyen bir sunucu hatası oluştu." },
      { status: 500 }
    )
  }
}
