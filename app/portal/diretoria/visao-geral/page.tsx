'use client';

import { useEffect, useMemo, useState } from 'react';

import { getDashboardOverview } from '@/services/dashboard.service';
import { CampaignsTable } from '@/components/CampaignsTable';
import { TopCampaigns } from '@/components/TopCampaigns';
import { TrendChart } from '@/components/TrendChart';
import { FunnelChart } from '@/components/FunnelChart';
import { DateSelector } from '@/components/DateSelector';

const CUSTOMER_ID = 1730254242;

type Platform = 'google' | 'meta' | 'all';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, suffix?: string) {
  return (
    new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2,
    }).format(value) + (suffix ?? '')
  );
}

const platformConfig: Record<
  Platform,
  {
    label: string;
    accentText: string;
    accentBg: string;
    accentBorder: string;
    accentSoft: string;
    buttonActive: string;
  }
> = {
  google: {
    label: 'Google Ads',
    accentText: 'text-blue-600',
    accentBg: 'bg-blue-600',
    accentBorder: 'border-blue-200',
    accentSoft: 'bg-blue-50',
    buttonActive: 'bg-blue-600 text-white border-blue-600 shadow-sm',
  },
  meta: {
    label: 'Meta Ads',
    accentText: 'text-sky-600',
    accentBg: 'bg-sky-600',
    accentBorder: 'border-sky-200',
    accentSoft: 'bg-sky-50',
    buttonActive: 'bg-sky-600 text-white border-sky-600 shadow-sm',
  },
  all: {
    label: 'Visão Geral',
    accentText: 'text-emerald-600',
    accentBg: 'bg-emerald-600',
    accentBorder: 'border-emerald-200',
    accentSoft: 'bg-emerald-50',
    buttonActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
  },
};

export default function VisaoGeralPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [platform, setPlatform] = useState<Platform>('google');

  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentPlatform = useMemo(() => platformConfig[platform], [platform]);

  async function loadDashboard(start: string, end: string, p = platform) {
    setLoading(true);

    const apiPlatform = p === 'all' ? undefined : p;

    try {
      const overviewRes = await getDashboardOverview(
        CUSTOMER_ID,
        start,
        end,
        apiPlatform
      );

      const campaignsRes = await fetch(
        `/api/dashboard/campaigns?customerId=${CUSTOMER_ID}&startDate=${start}&endDate=${end}${
          apiPlatform ? `&platform=${apiPlatform}` : ''
        }`
      ).then((r) => r.json());

      const trendRes = await fetch(
        `/api/dashboard/trend?customerId=${CUSTOMER_ID}&startDate=${start}&endDate=${end}${
          apiPlatform ? `&platform=${apiPlatform}` : ''
        }`
      ).then((r) => r.json());

      setOverview(overviewRes.data);
      setCampaigns(campaignsRes.data?.campaigns ?? []);
      setTopCampaigns(campaignsRes.data?.topCampaigns ?? []);
      setTrend(trendRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(startDate, endDate, platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-sm text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm">
          <p className="text-sm font-medium text-red-600">
            Erro ao carregar dados
          </p>
        </div>
      </div>
    );
  }

  const { kpis, funnel } = overview;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
              Dashboard de Marketing
            </p>

            <div className="mt-1 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-3">
              <h1 className={`text-lg font-semibold ${currentPlatform.accentText}`}>
                {currentPlatform.label}
              </h1>

              <div className="flex flex-wrap gap-1.5">
                <PlatformButton
                  label="Google"
                  active={platform === 'google'}
                  activeClass={platformConfig.google.buttonActive}
                  onClick={() => setPlatform('google')}
                />
                <PlatformButton
                  label="Meta"
                  active={platform === 'meta'}
                  activeClass={platformConfig.meta.buttonActive}
                  onClick={() => setPlatform('meta')}
                />
                <PlatformButton
                  label="Todos"
                  active={platform === 'all'}
                  activeClass={platformConfig.all.buttonActive}
                  onClick={() => setPlatform('all')}
                />
              </div>
            </div>
          </div>

          <DateSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
              loadDashboard(s, e, platform);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Investimento"
          value={formatCurrency(kpis.investimento)}
          accentClass={currentPlatform.accentBg}
          softClass={currentPlatform.accentSoft}
          borderClass={currentPlatform.accentBorder}
        />
        <KpiCard
          title="CPC"
          value={formatCurrency(kpis.cpc)}
          accentClass={currentPlatform.accentBg}
          softClass={currentPlatform.accentSoft}
          borderClass={currentPlatform.accentBorder}
        />
        <KpiCard
          title="CTR"
          value={formatNumber(kpis.ctr * 100, '%')}
          accentClass={currentPlatform.accentBg}
          softClass={currentPlatform.accentSoft}
          borderClass={currentPlatform.accentBorder}
        />
        <KpiCard
          title="CPA"
          value={formatCurrency(kpis.cpa)}
          accentClass={currentPlatform.accentBg}
          softClass={currentPlatform.accentSoft}
          borderClass={currentPlatform.accentBorder}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <SectionCard title="Funil">
          <FunnelChart data={funnel} />
        </SectionCard>

        <div className="xl:col-span-2">
          <SectionCard title="Tendência">
            <TrendChart data={trend} />
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard title="Campanhas">
            <CampaignsTable campaigns={campaigns} />
          </SectionCard>
        </div>

        <SectionCard title="Top campanhas">
          <TopCampaigns campaigns={topCampaigns} />
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  title,
  value,
  accentClass,
  softClass,
  borderClass,
}: {
  title: string;
  value: string;
  accentClass: string;
  softClass: string;
  borderClass: string;
}) {
  return (
    <div className={`rounded-lg border bg-white p-3 shadow-sm ${borderClass}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className={`h-1 w-8 rounded-full ${accentClass}`} />
        <div
          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium text-gray-600 ${softClass} ${borderClass}`}
        >
          KPI
        </div>
      </div>

      <p className="text-xs text-gray-500">{title}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>
    </div>
  );
}

function PlatformButton({
  label,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-lg border px-3 py-1 text-xs font-medium transition-all',
        active
          ? activeClass
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}