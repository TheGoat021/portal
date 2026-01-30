type TopCampaign = {
  campaign_name?: string;
  platform: string;
  conversions: number;
};

export function TopCampaigns({
  campaigns,
}: {
  campaigns: TopCampaign[];
}) {
  return (
    <div className="bg-black border border-green-500 rounded-xl p-6 text-gray-200">
      <h2 className="text-green-400 mb-4">Top Campanhas</h2>

      <ul className="space-y-3">
        {campaigns.map((c, index) => (
          <li
            key={index}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {/* Rank */}
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500/20 text-green-400 text-sm font-semibold">
                {index + 1}
              </span>

              {/* Nome + plataforma */}
              <div>
                <p className="text-sm">
                  {c.campaign_name ?? '—'}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {c.platform}
                </p>
              </div>
            </div>

            {/* Conversões */}
            <span className="text-green-400 text-sm font-medium">
              {c.conversions ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}