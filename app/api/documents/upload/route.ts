import { uploadDocumentToStorage } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${fileExt ? `.${fileExt}` : ""}`;
    const publicUrl = await uploadDocumentToStorage({
      fileName,
      content: file,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      fileName,
      publicUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Upload failed." },
      { status: 500 }
    );
  }
}
