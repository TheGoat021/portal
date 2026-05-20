"use client";

type PortalContentProps = {
  href: string;
  onBack: () => void;
};

function getEmbedUrl(url: string) {
  if (url.includes("youtube.com/watch")) {
    const videoId = new URL(url).searchParams.get("v");
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
}

export function PortalContent({ href, onBack }: PortalContentProps) {
  const embedUrl = getEmbedUrl(href);

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur-xl transition hover:bg-white hover:text-slate-900"
      >
        <span>←</span>
        <span>Voltar ao workspace</span>
      </button>

      <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/55 p-3 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur-xl">
        <iframe
          key={embedUrl}
          className="h-[720px] w-full rounded-[24px] border border-slate-200/70 bg-white"
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
