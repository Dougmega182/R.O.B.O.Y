import { logFeedItem } from "@/lib/feed";
import { uploadDocumentToStorage } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type JsonAttachment = {
  filename?: string;
  name?: string;
  contentType?: string;
  content_type?: string;
  content?: string;
  base64?: string;
};

function inferCategory(input: string) {
  const text = input.toLowerCase();
  if (text.includes("school")) return "School";
  if (text.includes("insurance")) return "Insurance";
  if (text.includes("medical") || text.includes("doctor") || text.includes("hospital")) return "Medical";
  if (text.includes("invoice") || text.includes("bank") || text.includes("receipt") || text.includes("tax")) return "Financial";
  if (text.includes("receipt")) return "Receipts";
  if (text.includes("legal") || text.includes("court")) return "Legal";
  return "General";
}

function getInboundToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const url = new URL(req.url);
  return bearer || req.headers.get("x-documents-inbound-token") || url.searchParams.get("token");
}

function buildStoredFileName(originalName: string) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
}

async function createDocumentRecord(params: {
  name: string;
  category: string;
  url: string;
}) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .insert([{
      name: params.name,
      category: params.category,
      url: params.url,
      uploaded_by: null,
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function saveJsonAttachment(attachment: JsonAttachment, category: string) {
  const fileName = attachment.filename || attachment.name || "attachment";
  const base64 = attachment.base64 || attachment.content;

  if (!base64) {
    throw new Error(`Attachment ${fileName} did not include base64 content.`);
  }

  const publicUrl = await uploadDocumentToStorage({
    fileName: buildStoredFileName(fileName),
    content: Uint8Array.from(Buffer.from(base64, "base64")),
    contentType: attachment.contentType || attachment.content_type || "application/octet-stream",
  });

  return createDocumentRecord({
    name: fileName,
    category,
    url: publicUrl,
  });
}

async function saveFileAttachment(file: File, category: string) {
  const publicUrl = await uploadDocumentToStorage({
    fileName: buildStoredFileName(file.name || "attachment"),
    content: file,
    contentType: file.type || "application/octet-stream",
  });

  return createDocumentRecord({
    name: file.name || "attachment",
    category,
    url: publicUrl,
  });
}

export async function POST(req: Request) {
  const expectedToken = process.env.DOCUMENTS_INBOUND_TOKEN?.trim();

  if (!expectedToken) {
    return NextResponse.json({ error: "DOCUMENTS_INBOUND_TOKEN is not configured." }, { status: 503 });
  }

  const providedToken = getInboundToken(req)?.trim();
  const allHeaders = Object.fromEntries(req.headers.entries());

  if (providedToken !== expectedToken) {
    console.log("Unauthorized Inbound Attempt:", { 
      provided: providedToken, 
      expected: expectedToken,
      providedLength: providedToken?.length,
      expectedLength: expectedToken?.length,
      match: providedToken === expectedToken,
      hasHeader: !!allHeaders["x-documents-inbound-token"]
    });
    return NextResponse.json({ error: "Unauthorized", debug: "Check server logs" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const savedDocuments: any[] = [];
    let sourceLabel = "Email attachment received";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const subject = String(body.subject || "");
      const sender = String(body.from || body.sender || "");
      sourceLabel = sender ? `Email from ${sender}` : sourceLabel;

      const attachments = Array.isArray(body.attachments) ? body.attachments : [];
      if (attachments.length === 0) {
        return NextResponse.json({ error: "No attachments found." }, { status: 400 });
      }

      for (const attachment of attachments) {
        const fileName = attachment.filename || attachment.name || subject || "attachment";
        const category = inferCategory(`${subject} ${fileName}`);
        savedDocuments.push(await saveJsonAttachment(attachment, category));
      }
    } else {
      const formData = await req.formData();
      const subject = String(formData.get("subject") || "");
      const sender = String(formData.get("from") || formData.get("sender") || "");
      sourceLabel = sender ? `Email from ${sender}` : sourceLabel;

      const files = Array.from(formData.values()).filter((value): value is File => value instanceof File && value.size > 0);
      if (files.length === 0) {
        return NextResponse.json({ error: "No attachments found." }, { status: 400 });
      }

      for (const file of files) {
        const category = inferCategory(`${subject} ${file.name}`);
        savedDocuments.push(await saveFileAttachment(file, category));
      }
    }

    await logFeedItem({
      type: "event",
      title: `${savedDocuments.length} document${savedDocuments.length === 1 ? "" : "s"} received by email`,
      subtitle: sourceLabel,
      icon: "📧",
      status: "active",
    });

    return NextResponse.json({ success: true, documents: savedDocuments });
  } catch (error: any) {
    console.error("POST /api/documents/inbound Error:", error);
    return NextResponse.json({ error: error?.message || "Inbound email processing failed." }, { status: 500 });
  }
}
