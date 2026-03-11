type TopCampaign = {
  campaign_name?: string;
  platform: string;
  conversions: number;
};

function getPlatformColor(platform: string) {
  if (platform === 'google') return 'bg-blue-100 text-blue-700';
  if (platform === 'meta') return 'bg-sky-100 text-sky-700';
  return 'bg-gray-100 text-gray-700';
}

export function TopCampaigns({
  campaigns,
}: {
  campaigns: TopCampaign[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Top Campanhas
        </h3>
        <p className="text-sm text-gray-500">
          Campanhas com maior volume de conversões.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <ul className="divide-y divide-gray-100">
          {campaigns.map((c, index) => (
            <li
              key={index}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                  {index + 1}
                </span>

                {/* Nome */}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {c.campaign_name ?? '—'}
                  </p>

                  <span
                    className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getPlatformColor(
                      c.platform
                    )}`}
                  >
                    {c.platform}
                  </span>
                </div>
              </div>

              {/* Conversões */}
              <span className="text-sm font-semibold text-gray-900">
                {c.conversions ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}