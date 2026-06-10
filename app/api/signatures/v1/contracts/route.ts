import { NextRequest } from "next/server";

import { authenticateSignatureApiRequest, getSignatureApiBaseUrl } from "@/lib/signatureApiAuth";
import { signatureApiError, signatureApiSuccess } from "@/lib/signatureApiResponse";
import { createSignatureDocument, getSignatureLink, publishSignatureDocument } from "@/lib/signatures";

export const runtime = "nodejs";

type ExternalContractPayload = {
  title: string;
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
  externalReference: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  publish: boolean;
};

async function parsePayload(request: NextRequest): Promise<ExternalContractPayload> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.toLowerCase().includes("application/json")) {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const fileBase64 = String(body.fileBase64 || "").trim();
    const fileName = String(body.fileName || `${title || "documento"}.pdf`).trim();
    const mimeType = String(body.mimeType || "application/pdf").trim() || "application/pdf";
    const externalReference = String(body.externalReference || "").trim() || null;
    const webhookUrl = String(body.webhookUrl || "").trim() || null;
    const webhookSecret = String(body.webhookSecret || "").trim() || null;
    const publish = body.publish !== false;

    if (!title) {
      throw new Error("title e obrigatorio.");
    }

    if (!fileBase64) {
      throw new Error("fileBase64 e obrigatorio.");
    }

    return {
      title,
      fileBuffer: Buffer.from(fileBase64, "base64"),
      mimeType,
      fileName,
      externalReference,
      webhookUrl,
      webhookSecret,
      publish,
    };
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const title = String(form.get("title") || "").trim();
  const externalReference = String(form.get("externalReference") || "").trim() || null;
  const webhookUrl = String(form.get("webhookUrl") || "").trim() || null;
  const webhookSecret = String(form.get("webhookSecret") || "").trim() || null;
  const publishValue = String(form.get("publish") || "true").trim().toLowerCase();
  const publish = publishValue !== "false";

  if (!title) {
    throw new Error("title e obrigatorio.");
  }

  if (!file) {
    throw new Error("file e obrigatorio.");
  }

  return {
    title,
    fileBuffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || "application/pdf",
    fileName: file.name || `${title}.pdf`,
    externalReference,
    webhookUrl,
    webhookSecret,
    publish,
  };
}

export async function POST(request: NextRequest) {
  const auth = authenticateSignatureApiRequest(request);

  if (!auth.ok) {
    return signatureApiError(auth.error, auth.status, "unauthorized");
  }

  try {
    const payload = await parsePayload(request);

    if (payload.mimeType.toLowerCase() !== "application/pdf") {
      return signatureApiError("Somente arquivos PDF sao aceitos.", 400, "invalid_file_type");
    }

    const created = await createSignatureDocument({
      title: payload.title,
      fileBuffer: payload.fileBuffer,
      mimeType: payload.mimeType,
      fileName: payload.fileName,
      externalReference: payload.externalReference,
      integrationSource: auth.client.id,
      webhookUrl: payload.webhookUrl,
      webhookSecret: payload.webhookSecret,
    });

    if (!created) {
      return signatureApiError("Nao foi possivel criar o contrato.", 500, "create_failed");
    }

    const published = payload.publish ? await publishSignatureDocument(created.id) : created;
    const link = await getSignatureLink(created.id);
    const baseUrl = getSignatureApiBaseUrl();

    return signatureApiSuccess(
      {
        id: published?.id || created.id,
        title: published?.title || created.title,
        status: published?.status || created.status,
        externalReference: published?.externalReference || created.externalReference,
        integrationSource: published?.integrationSource || created.integrationSource,
        webhookUrl: published?.webhookUrl || created.webhookUrl,
        createdAt: published?.createdAt || created.createdAt,
        publishedAt: published?.publishedAt || created.publishedAt,
        signingUrl: link.signingUrl,
        endpoints: {
          self: `${baseUrl}/contracts/${created.id}`,
          link: `${baseUrl}/contracts/${created.id}/link`,
          status: `${baseUrl}/contracts/${created.id}/status`,
        },
      },
      201
    );
  } catch (error) {
    return signatureApiError(
      error instanceof Error ? error.message : "Erro ao criar contrato para assinatura.",
      500,
      "create_failed"
    );
  }
}
