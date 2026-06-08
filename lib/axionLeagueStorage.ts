import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DEFAULT_AXION_LEAGUE_BUCKET = "axion-league-assets";

function getAxionLeagueBucketName() {
  return process.env.AXION_LEAGUE_BUCKET || DEFAULT_AXION_LEAGUE_BUCKET;
}

function extensionFromMime(mimeType?: string | null) {
  const normalized = (mimeType || "").toLowerCase().split(";")[0].trim();

  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return map[normalized] || "bin";
}

export async function uploadAxionLeagueParticipantPhoto(input: {
  fileBuffer: Buffer;
  mimeType?: string | null;
  employeeSlug: string;
}) {
  const bucketName = getAxionLeagueBucketName();
  const ext = extensionFromMime(input.mimeType);
  const hash = crypto.createHash("sha256").update(input.fileBuffer).digest("hex");
  const safeSlug = input.employeeSlug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase() || "participant";
  const filePath = `participants/${safeSlug}/photo-${hash.slice(0, 12)}.${ext}`;

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
    publicUrl: data.publicUrl,
  };
}
