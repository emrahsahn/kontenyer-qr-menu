import { NextRequest, NextResponse } from "next/server"
import { exportMenuData } from "@/lib/data/menu-store"
import { verifyStaffSession } from "@/lib/security/auth-guard"

export async function GET(request: NextRequest) {
  try {
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Menü yedeği almak için görevli girişi yapınız." },
        { status: 401 }
      )
    }

    const backup = await exportMenuData()
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `kontenyer_menu_backup_${dateStr}.json`

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0"
      }
    })
  } catch (error) {
    console.error("Menu backup GET error:", error)
    return NextResponse.json(
      { error: "Menü yedeği oluşturulurken bir hata meydana geldi." },
      { status: 500 }
    )
  }
}
