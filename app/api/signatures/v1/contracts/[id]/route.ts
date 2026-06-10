import { NextRequest } from "next/server";

import { authenticateSignatureApiRequest, getSignatureApiBaseUrl } from "@/lib/signatureApiAuth";
import { signatureApiError, signatureApiSuccess } from "@/lib/signatureApiResponse";
import { getSignatureDocumentById } from "@/lib/signatures";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = authenticateSignatureApiRequest(request);

  if (!auth.ok) {
    return signatureApiError(auth.error, auth.status, "unauthorized");
  }

  try {
    const { id } = await context.params;
    const document = await getSignatureDocumentById(id);

    if (!document) {
      return signatureApiError("Contrato nao encontrado.", 404, "not_found");
    }

    const baseUrl = getSignatureApiBaseUrl();

    return signatureApiSuccess({
      id: document.id,
      title: document.title,
      status: document.status,
      externalReference: document.externalReference,
      integrationSource: document.integrationSource,
      webhookUrl: document.webhookUrl,
      createdAt: document.createdAt,
      publishedAt: document.publishedAt,
      signedAt: document.signedAt,
      signer: document.signerName
        ? {
            fullName: document.signerName,
            phone: document.signerPhone,
            cpf: document.signerCpf,
          }
        : null,
      files: {
        originalUrl: document.originalFileUrl,
        signedUrl: document.signedFileUrl,
      },
      endpoints: {
        link: `${baseUrl}/contracts/${document.id}/link`,
        status: `${baseUrl}/contracts/${document.id}/status`,
      },
    });
  } catch (error) {
    return signatureApiError(
      error instanceof Error ? error.message : "Erro ao consultar contrato.",
      500,
      "fetch_failed"
    );
  }
}
