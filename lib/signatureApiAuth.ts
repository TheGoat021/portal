import { NextRequest } from "next/server";

type SignatureApiClient = {
  id: string;
  key: string;
};

function parseConfiguredClients() {
  const raw = process.env.SIGNATURE_API_KEYS || "";

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map<SignatureApiClient>((entry, index) => {
      const [idPart, keyPart] = entry.includes(":") ? entry.split(":") : [`client-${index + 1}`, entry];
      return {
        id: (idPart || `client-${index + 1}`).trim(),
        key: (keyPart || "").trim(),
      };
    })
    .filter((client) => client.key);
}

export function authenticateSignatureApiRequest(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")?.trim() || "";

  if (!apiKey) {
    return {
      ok: false as const,
      status: 401,
      error: "Cabecalho x-api-key obrigatorio.",
    };
  }

  const clients = parseConfiguredClients();
  const matchedClient = clients.find((client) => client.key === apiKey);

  if (!matchedClient) {
    return {
      ok: false as const,
      status: 403,
      error: "x-api-key invalido.",
    };
  }

  return {
    ok: true as const,
    client: matchedClient,
  };
}

export function getSignatureApiBaseUrl() {
  return `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/signatures/v1`;
}
