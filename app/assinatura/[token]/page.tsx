import PublicSignatureView from "@/components/signatures/PublicSignatureView";

export default async function AssinaturaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicSignatureView token={token} />;
}
