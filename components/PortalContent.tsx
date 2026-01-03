"use client";

type PortalContentProps = {
  href: string;
  onBack: () => void;
};

function getEmbedUrl(url: string) {
  // YouTube padrão
  if (url.includes("youtube.com/watch")) {
    const videoId = new URL(url).searchParams.get("v");
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  // YouTube encurtado
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  // Qualquer outro sistema externo
  return url;
}

export function PortalContent({ href, onBack }: PortalContentProps) {
  const embedUrl = getEmbedUrl(href);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Voltar ao dashboard
      </button>

      <iframe
        key={embedUrl}
        className="w-full h-[600px] rounded-lg border"
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
