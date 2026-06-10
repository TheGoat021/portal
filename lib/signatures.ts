import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateSignedContractPdf } from "@/lib/signaturePdf";
import { downloadSignatureAsset, uploadSignatureAsset } from "@/lib/signatureStorage";
import { sendSignatureWebhook } from "@/lib/signatureWebhook";
import type {
  PublicSignatureDocument,
  SignatureDocument,
  SignatureFont,
  SignatureStatus,
} from "@/types/signatures";

type RawDocumentRow = {
  id: string;
  title: string;
  status: SignatureStatus;
  original_file_path: string;
  original_file_url: string;
  signed_file_path: string | null;
  signed_file_url: string | null;
  public_token: string | null;
  created_at: string;
  published_at: string | null;
  signed_at: string | null;
  created_by_user_id: string | null;
  external_reference: string | null;
  integration_source: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  signer_name: string | null;
  signer_phone: string | null;
  signer_cpf: string | null;
};

function mapDocument(row: RawDocumentRow): SignatureDocument {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    originalFilePath: row.original_file_path,
    originalFileUrl: row.original_file_url,
    signedFilePath: row.signed_file_path,
    signedFileUrl: row.signed_file_url,
    publicToken: row.public_token,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    signedAt: row.signed_at,
    createdByUserId: row.created_by_user_id,
    externalReference: row.external_reference,
    integrationSource: row.integration_source,
    webhookUrl: row.webhook_url,
    webhookSecret: row.webhook_secret,
    signerName: row.signer_name,
    signerPhone: row.signer_phone,
    signerCpf: row.signer_cpf,
  };
}

function generatePublicToken() {
  return crypto.randomBytes(24).toString("hex");
}

function generateVerificationCode() {
  return crypto.randomBytes(16).toString("hex");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 20);
}

function normalizeCpf(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

async function logSignatureEvent(documentId: string, eventType: string, payload?: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("signature_events").insert({
    document_id: documentId,
    event_type: eventType,
    payload_json: payload ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function listSignatureDocuments(input?: { status?: string | null; search?: string | null }) {
  let query = supabaseAdmin
    .from("signature_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  if (input?.search) {
    const escaped = input.search.replace(/[%(),]/g, " ");
    query = query.or(
      `title.ilike.%${escaped}%,external_reference.ilike.%${escaped}%,signer_name.ilike.%${escaped}%,signer_cpf.ilike.%${escaped}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as RawDocumentRow[] | null) ?? [];
  return rows.map((row) => mapDocument(row));
}

export async function getSignatureDocumentById(documentId: string) {
  const { data, error } = await supabaseAdmin
    .from("signature_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapDocument(data as RawDocumentRow);
}

async function getSignatureDocumentByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("signature_documents")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapDocument(data as RawDocumentRow);
}

export async function getPublicSignatureDocumentByToken(token: string): Promise<PublicSignatureDocument | null> {
  const document = await getSignatureDocumentByToken(token);

  if (!document) return null;

  return {
    id: document.id,
    title: document.title,
    status: document.status,
    originalFileUrl: document.originalFileUrl,
    signedFileUrl: document.signedFileUrl,
    signedAt: document.signedAt,
    signerName: document.signerName,
    signerCpf: document.signerCpf,
  };
}

export async function createSignatureDocument(input: {
  title: string;
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
  createdByUserId?: string | null;
  externalReference?: string | null;
  integrationSource?: string | null;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
}) {
  const documentId = crypto.randomUUID();
  const uploadedOriginal = await uploadSignatureAsset({
    documentId,
    fileBuffer: input.fileBuffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
    kind: "original",
  });

  const { data, error } = await supabaseAdmin
    .from("signature_documents")
    .insert({
      id: documentId,
      title: input.title,
      status: "draft",
      original_file_path: uploadedOriginal.filePath,
      original_file_url: uploadedOriginal.publicUrl,
      created_by_user_id: input.createdByUserId || null,
      external_reference: input.externalReference || null,
      integration_source: input.integrationSource || null,
      webhook_url: input.webhookUrl || null,
      webhook_secret: input.webhookSecret || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Nao foi possivel criar o contrato.");
  }

  await logSignatureEvent(documentId, "uploaded", {
    title: input.title,
    file_name: input.fileName,
  });

  return getSignatureDocumentById(documentId);
}

export async function updateSignatureDocument(input: {
  documentId: string;
  title?: string;
}) {
  if (input.title) {
    const { error } = await supabaseAdmin
      .from("signature_documents")
      .update({ title: input.title })
      .eq("id", input.documentId);

    if (error) {
      throw new Error(error.message);
    }
  }

  return getSignatureDocumentById(input.documentId);
}

export async function publishSignatureDocument(documentId: string) {
  const document = await getSignatureDocumentById(documentId);

  if (!document) {
    throw new Error("Contrato nao encontrado.");
  }

  const publicToken = document.publicToken || generatePublicToken();

  const { error } = await supabaseAdmin
    .from("signature_documents")
    .update({
      public_token: publicToken,
      published_at: new Date().toISOString(),
      status: document.status === "signed" ? "signed" : "pending_signature",
    })
    .eq("id", documentId);

  if (error) {
    throw new Error(error.message);
  }

  await logSignatureEvent(documentId, "link_generated", {
    public_token: publicToken,
  });

  return getSignatureDocumentById(documentId);
}

export async function getSignatureLink(documentId: string) {
  const document = await getSignatureDocumentById(documentId);

  if (!document) {
    throw new Error("Contrato nao encontrado.");
  }

  return {
    id: document.id,
    status: document.status,
    publicToken: document.publicToken,
    signingUrl: document.publicToken
      ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/assinatura/${document.publicToken}`
      : null,
  };
}

export async function getSignatureStatus(documentId: string) {
  const document = await getSignatureDocumentById(documentId);

  if (!document) {
    throw new Error("Contrato nao encontrado.");
  }

  return {
    id: document.id,
    title: document.title,
    status: document.status,
    signedAt: document.signedAt,
    signerName: document.signerName,
    signerCpf: document.signerCpf,
    signedFileUrl: document.signedFileUrl,
    webhookUrl: document.webhookUrl,
  };
}

export async function submitPublicSignature(input: {
  token: string;
  fullName: string;
  phone: string;
  cpf: string;
  signatureFont: SignatureFont;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const document = await getSignatureDocumentByToken(input.token);

  if (!document) {
    throw new Error("Link de assinatura nao encontrado.");
  }

  if (document.status === "signed") {
    return document;
  }

  if (document.status !== "pending_signature") {
    throw new Error("Este contrato ainda nao esta disponivel para assinatura.");
  }

  const signedAt = new Date();
  const verificationCode = generateVerificationCode();
  const pdfBuffer = await downloadSignatureAsset(document.originalFilePath);
  const originalHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  const signerCpf = normalizeCpf(input.cpf);
  const signerPhone = normalizePhone(input.phone);
  const signedPdfBuffer = await generateSignedContractPdf({
    pdfBuffer,
    documentTitle: document.title,
    documentId: document.id,
    documentCreatedAt: document.createdAt,
    originalHash,
    fullName: input.fullName,
    phone: signerPhone,
    cpf: signerCpf,
    signatureFont: input.signatureFont,
    verificationCode,
    signedAt,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const uploadedSigned = await uploadSignatureAsset({
    documentId: document.id,
    fileBuffer: signedPdfBuffer,
    mimeType: "application/pdf",
    fileName: `${document.title}-signed.pdf`,
    kind: "signed",
  });
  const { error: signerError } = await supabaseAdmin.from("signature_signers").insert({
    document_id: document.id,
    full_name: input.fullName,
    phone: signerPhone,
    cpf: signerCpf,
    signature_font: input.signatureFont,
    signature_text: input.fullName,
    ip_address: input.ipAddress || null,
    user_agent: input.userAgent || null,
    signed_at: signedAt.toISOString(),
    verification_code: verificationCode,
  });

  if (signerError) {
    throw new Error(signerError.message);
  }

  const { error: updateError } = await supabaseAdmin
    .from("signature_documents")
    .update({
      status: "signed",
      signer_name: input.fullName,
      signer_phone: signerPhone,
      signer_cpf: signerCpf,
      signed_at: signedAt.toISOString(),
      signed_file_path: uploadedSigned.filePath,
      signed_file_url: uploadedSigned.publicUrl,
    })
    .eq("id", document.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await logSignatureEvent(document.id, "signed", {
    signed_at: signedAt.toISOString(),
    verification_code: verificationCode,
    original_hash: originalHash,
  });

  const signedDocument = await getSignatureDocumentById(document.id);

  if (
    signedDocument?.webhookUrl &&
    signedDocument.integrationSource &&
    signedDocument.signedFileUrl
  ) {
    const webhookPayload = {
      event: "signature.completed",
      document: {
        id: signedDocument.id,
        title: signedDocument.title,
        status: signedDocument.status,
        externalReference: signedDocument.externalReference,
        integrationSource: signedDocument.integrationSource,
        createdAt: signedDocument.createdAt,
        publishedAt: signedDocument.publishedAt,
        signedAt: signedDocument.signedAt,
        signingUrl: signedDocument.publicToken
          ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/assinatura/${signedDocument.publicToken}`
          : null,
        originalFileUrl: signedDocument.originalFileUrl,
        signedFileUrl: signedDocument.signedFileUrl,
      },
      signer: {
        fullName: signedDocument.signerName,
        phone: signedDocument.signerPhone,
        cpf: signedDocument.signerCpf,
      },
      audit: {
        verificationCode,
        originalHash,
        signedAt: signedAt.toISOString(),
      },
    };

    try {
      await sendSignatureWebhook({
        webhookUrl: signedDocument.webhookUrl,
        webhookSecret: signedDocument.webhookSecret,
        payload: webhookPayload,
      });

      await logSignatureEvent(document.id, "webhook_delivered", {
        webhook_url: signedDocument.webhookUrl,
      });
    } catch (error) {
      await logSignatureEvent(document.id, "webhook_failed", {
        webhook_url: signedDocument.webhookUrl,
        error: error instanceof Error ? error.message : "Falha ao enviar webhook.",
      });
    }
  }

  return signedDocument;
}
