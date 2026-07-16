import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { hitRateLimit, getClientIp } from "@/lib/rate-limit"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// L4: form di contatto pubblico -> limitiamo per IP e mettiamo un cap su ogni
// campo per evitare spam e insert di payload arbitrariamente grandi.
const RATE_MAX = 5
const RATE_WINDOW_MS = 60 * 1000
const MAX_NAME_LEN = 120
const MAX_EMAIL_LEN = 200
const MAX_MESSAGE_LEN = 2000

export async function POST(request: NextRequest) {
  try {
    const rl = hitRateLimit(`contact:${getClientIp(request)}`, RATE_MAX, RATE_WINDOW_MS)
    if (rl.limited) {
      return NextResponse.json(
        { error: "too_many_requests" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    const body = await request.json()
    const { name, email, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 })
    }
    if (name.length > MAX_NAME_LEN || email.length > MAX_EMAIL_LEN) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ error: "Message must be under 2000 characters" }, { status: 400 })
    }

    const { error } = await supabase
      .from("contact_messages")
      .insert({ name, email, message })

    if (error) throw error

    return NextResponse.json({ success: true, message: "Message sent successfully" }, { status: 200 })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
