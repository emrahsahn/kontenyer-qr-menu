import { NextRequest, NextResponse } from "next/server"
import {
  getCustomerById,
  findCustomer,
  registerCustomer,
  getAllCustomers,
  deleteCustomer,
  updateCustomer
} from "@/lib/data/loyalty-store"
import { verifyStaffSession } from "@/lib/security/auth-guard"
import { checkGeneralRateLimit } from "@/lib/security/rate-limiter"

// GET: Retrieve customer by id, search customers, or list all customers (staff)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const q = searchParams.get("q")

    // 1. Direct fetch by ID (Used by customer's phone when loading own card)
    if (id) {
      const customer = await getCustomerById(id)
      if (!customer) {
        return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 })
      }
      return NextResponse.json({ customer })
    }

    // 2. Search query (Phone, Code, Name - Staff Panel)
    if (q) {
      const auth = verifyStaffSession(request)
      if (!auth.authenticated) {
        return NextResponse.json(
          { error: "Arama yapmak için personel girişi gereklidir." },
          { status: 401 }
        )
      }

      const results = await findCustomer(q)
      return NextResponse.json({ customers: results })
    }

    // 3. All Customers List (Staff Panel)
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Müşteri listesini görüntülemek için personel girişi gereklidir." },
        { status: 401 }
      )
    }

    const all = await getAllCustomers()
    return NextResponse.json({ customers: all })
  } catch (error) {
    console.error("Loyalty customer GET error:", error)
    return NextResponse.json(
      { error: "Müşteri bilgileri alınırken bir hata oluştu." },
      { status: 500 }
    )
  }
}

// POST: Register or sign-in customer with Name, Phone & KVKK consent
export async function POST(request: NextRequest) {
  try {
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "127.0.0.1"
    const rateLimit = checkGeneralRateLimit(`loyalty_reg_${ip}`, 12, 60 * 1000)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Çok fazla kart oluşturma isteği yapıldı. Güvenliğiniz için lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyiniz.`
        },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: "Geçersiz istek gövdesi." },
        { status: 400 }
      )
    }

    const { fullName, phone, kvkkConsent } = body

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { error: "Lütfen ad ve soyadınızı giriniz." },
        { status: 400 }
      )
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Lütfen geçerli bir telefon numarası giriniz." },
        { status: 400 }
      )
    }

    if (kvkkConsent !== true) {
      return NextResponse.json(
        { error: "Sadakat kartı oluşturmak için lütfen KVKK Aydınlatma Metni'ni onaylayınız." },
        { status: 400 }
      )
    }

    const customer = await registerCustomer(fullName, phone, kvkkConsent)
    return NextResponse.json({
      success: true,
      customer,
      message: "Sadakat kartınız başarıyla hazırlandı!"
    })
  } catch (error) {
    console.error("Loyalty customer POST error:", error)
    const errorMsg = error instanceof Error ? error.message : "Müşteri kartı oluşturulamadı."
    return NextResponse.json({ error: errorMsg }, { status: 400 })
  }
}

// DELETE: Remove customer (Staff only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Müşteri silmek için personel girişi gereklidir." },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Silinecek müşteri ID'si belirtilmedi." },
        { status: 400 }
      )
    }

    const deleted = await deleteCustomer(id)
    if (!deleted) {
      return NextResponse.json(
        { error: "Silinecek müşteri bulunamadı." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Müşteri kaydı ve verileri başarıyla silindi."
    })
  } catch (error) {
    console.error("Loyalty customer DELETE error:", error)
    return NextResponse.json(
      { error: "Müşteri silinirken bir hata meydana geldi." },
      { status: 500 }
    )
  }
}

// PUT: Update customer details (Name & Phone - Staff only)
export async function PUT(request: NextRequest) {
  try {
    const auth = verifyStaffSession(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Müşteri bilgilerini güncellemek için personel girişi gereklidir." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || !body.id) {
      return NextResponse.json(
        { error: "Güncellenecek müşteri ID'si belirtilmedi." },
        { status: 400 }
      )
    }

    const { id, fullName, phone } = body
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { error: "Lütfen geçerli bir ad soyad giriniz." },
        { status: 400 }
      )
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Lütfen geçerli bir telefon numarası giriniz." },
        { status: 400 }
      )
    }

    const updated = await updateCustomer(id, { fullName, phone })
    return NextResponse.json({
      success: true,
      customer: updated,
      message: "Müşteri bilgileri başarıyla güncellendi."
    })
  } catch (error) {
    console.error("Loyalty customer PUT error:", error)
    const errorMsg = error instanceof Error ? error.message : "Müşteri güncellenirken bir hata oluştu."
    return NextResponse.json({ error: errorMsg }, { status: 400 })
  }
}
