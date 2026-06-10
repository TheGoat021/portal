import { NextRequest } from "next/server";

import { authenticateSignatureApiRequest } from "@/lib/signatureApiAuth";
import { signatureApiError, signatureApiSuccess } from "@/lib/signatureApiResponse";
import { getSignatureLink } from "@/lib/signatures";

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
    return signatureApiSuccess(await getSignatureLink(id));
  } catch (error) {
    return signatureApiError(
      error instanceof Error ? error.message : "Erro ao consultar link de assinatura.",
      500,
      "fetch_link_failed"
    );
  }
}
