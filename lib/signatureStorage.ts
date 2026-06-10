import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DEFAULT_SIGNATURE_BUCKET = "signature-assets";

function getSignatureBucketName() {
  return process.env.SIGNATURE_BUCKET || DEFAULT_SIGNATURE_BUCKET;
}

function extensionFromMime(mimeType?: string | null) {
  const normalized = (mimeType || "").toLowerCase().split(";")[0].trim();

  if (normalized === "application/pdf") return "pdf";
  return "bin";
}

export async function uploadSignatureAsset(input: {
  documentId: string;
  fileBuffer: Buffer;
  mimeType?: string | null;
  fileName?: string | null;
  kind: "original" | "signed";
}) {
  const bucketName = getSignatureBucketName();
  const ext = extensionFromMime(input.mimeType);
  const hash = crypto.createHash("sha256").update(input.fileBuffer).digest("hex");
  const safeId = input.documentId.replace(/[^a-z0-9-_]/gi, "-").toLowerCase() || "document";
  const filePath = `documents/${safeId}/${input.kind}-${hash.slice(0, 16)}.${ext}`;

  let { error } = await supabaseAdmin.storage.from(bucketName).upload(filePath, input.fileBuffer, {
    contentType: input.mimeType || "application/octet-stream",
    upsert: true,
  });

  if (error && /bucket not found/i.test(error.message)) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
    });

    if (!createError) {
      const retry = await supabaseAdmin.storage.from(bucketName).upload(filePath, input.fileBuffer, {
        contentType: input.mimeType || "application/octet-stream",
        upsert: true,
      });

      error = retry.error;
    }
  }

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

  return {
    bucketName,
    filePath,
    publicUrl: data.publicUrl,
    fileName: input.fileName || `${input.kind}.${ext}`,
  };
}

export async function downloadSignatureAsset(filePath: string) {
  const bucketName = getSignatureBucketName();
  const { data, error } = await supabaseAdmin.storage.from(bucketName).download(filePath);

  if (error || !data) {
    throw new Error(error?.message || "Nao foi possivel baixar o arquivo do contrato.");
  }

  return Buffer.from(await data.arrayBuffer());
}
