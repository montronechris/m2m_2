import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 })
    }
    if (message.length > 2000) {
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
