import { NextRequest, NextResponse } from "next/server"
import { getMenuTemplate } from "@/lib/data/menu-store"
import { verifyStaffSession } from "@/lib/security/auth-guard"

export async function GET(request: NextRequest) {
  try {
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Yetkisiz işlem. Menü şablonu indirmek için görevli girişi yapınız." },
        { status: 401 }
      )
    }

    const template = getMenuTemplate()
    const filename = "kontenyer_menu_sablon.json"

    return new NextResponse(JSON.stringify(template, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0"
      }
    })
  } catch (error) {
    console.error("Menu template GET error:", error)
    return NextResponse.json(
      { error: "Menü şablonu oluşturulurken bir hata meydana geldi." },
      { status: 500 }
    )
  }
}
