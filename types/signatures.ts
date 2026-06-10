export type SignatureStatus = "draft" | "pending_signature" | "signed" | "cancelled" | "expired";

export type SignatureFont =
  | "classic"
  | "elegant"
  | "monospace"
  | "formal";

export type SignatureField = {
  id?: string;
  documentId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SignatureDocument = {
  id: string;
  title: string;
  status: SignatureStatus;
  originalFilePath: string;
  originalFileUrl: string;
  signedFilePath: string | null;
  signedFileUrl: string | null;
  publicToken: string | null;
  createdAt: string;
  publishedAt: string | null;
  signedAt: string | null;
  createdByUserId: string | null;
  externalReference: string | null;
  integrationSource: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  signerName: string | null;
  signerPhone: string | null;
  signerCpf: string | null;
};

export type PublicSignatureDocument = {
  id: string;
  title: string;
  status: SignatureStatus;
  originalFileUrl: string;
  signedFileUrl: string | null;
  signedAt: string | null;
  signerName: string | null;
  signerCpf: string | null;
};
