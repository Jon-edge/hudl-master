import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const uniqueName = `${crypto.randomUUID()}-${safeName || "avatar"}`

    const { url } = await put(`plinko/avatars/${uniqueName}`, file, {
      access: "public"
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Failed to upload avatar to Blob:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
