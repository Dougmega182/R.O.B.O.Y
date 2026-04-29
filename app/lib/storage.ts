export const DOCUMENTS_BUCKET =
  process.env.SUPABASE_DOCUMENTS_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET ||
  "documents";

import { createAdminClient } from "@/lib/supabase/server";

function isMissingBucketError(message?: string) {
  if (!message) return false;
  const text = message.toLowerCase();
  return text.includes("not found") || text.includes("does not exist");
}

export async function ensureDocumentsBucket() {
  const supabase = createAdminClient();
  const { data: bucket, error } = await supabase.storage.getBucket(DOCUMENTS_BUCKET);

  if (!error && bucket) {
    return supabase;
  }

  if (!isMissingBucketError(error?.message)) {
    throw error;
  }

  const { error: createError } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
    public: true,
    fileSizeLimit: "50MB",
  });

  if (createError) {
    throw createError;
  }

  return supabase;
}

export async function uploadDocumentToStorage(params: {
  fileName: string;
  content: File | Blob | ArrayBuffer | Uint8Array;
  contentType?: string;
}) {
  const supabase = await ensureDocumentsBucket();

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(params.fileName, params.content, {
      contentType: params.contentType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(params.fileName);
  return data.publicUrl;
}
