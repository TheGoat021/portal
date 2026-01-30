'use client';

import { useEffect, useState } from 'react';

import { getDashboardOverview } from '@/services/dashboard.service';
import { CampaignsTable } from '@/components/CampaignsTable';
import { TopCampaigns } from '@/components/TopCampaigns';
import { TrendChart } from '@/components/TrendChart';
import { FunnelChart } from '@/components/FunnelChart';
import { DateSelector } from '@/components/DateSelector';

const CUSTOMER_ID = 1730254242;

type Platform = 'google' | 'meta' | 'all';

/* ===============================
   🔹 HELPERS
=============================== */
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

  /* ===============================
     🔹 LOAD CENTRAL
  =============================== */
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

      // ✅ CONTRATO CORRETO DA API
      setCampaigns(campaignsRes.data?.campaigns ?? []);
      setTopCampaigns(campaignsRes.data?.topCampaigns ?? []);

      setTrend(trendRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  /* ===============================
     🔹 LOAD AUTOMÁTICO
  =============================== */
  useEffect(() => {
    loadDashboard(startDate, endDate, platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  if (loading) return <p>Carregando...</p>;
  if (!overview) return <p>Erro ao carregar dados</p>;

  const { kpis, funnel } = overview;

  return (
    <div className="space-y-8">
      {/* TOPO */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl text-green-400 font-semibold">
            Visão Geral
          </h1>

          <div className="flex gap-2">
            <PlatformButton
              label="Google"
              active={platform === 'google'}
              onClick={() => setPlatform('google')}
            />
            <PlatformButton
              label="Meta"
              active={platform === 'meta'}
              onClick={() => setPlatform('meta')}
            />
            <PlatformButton
              label="Todos"
              active={platform === 'all'}
              onClick={() => setPlatform('all')}
            />
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

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Investimento"
          value={formatCurrency(kpis.investimento)}
        />
        <KpiCard
          title="CPC"
          value={formatCurrency(kpis.cpc)}
        />
        <KpiCard
          title="CTR"
          value={formatNumber(kpis.ctr * 100, '%')}
        />
        <KpiCard
          title="CPA"
          value={formatCurrency(kpis.cpa)}
        />
      </div>

      {/* Funil + Tendência */}
      <div className="grid grid-cols-3 gap-6">
        <FunnelChart data={funnel} />
        <div className="col-span-2">
          <TrendChart data={trend} />
        </div>
      </div>

      {/* Campanhas */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <CampaignsTable campaigns={campaigns} />
        </div>
        <TopCampaigns campaigns={topCampaigns} />
      </div>
    </div>
  );
}

/* ===============================
   🔹 COMPONENTES AUX
=============================== */

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-black border border-green-500 rounded-xl p-4 text-gray-200">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-xl text-green-400 font-semibold">{value}</p>
    </div>
  );
}

function PlatformButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded text-sm font-medium transition
        ${
          active
            ? 'bg-green-500 text-black'
            : 'bg-black text-green-400 border border-green-500'
        }`}
    >
      {label}
    </button>
  );
}