import { uploadDocumentToStorage } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
    }

    const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const fileName = `members/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const publicUrl = await uploadDocumentToStorage({
      fileName,
      content: file,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Avatar upload failed." }, { status: 500 });
  }
}
