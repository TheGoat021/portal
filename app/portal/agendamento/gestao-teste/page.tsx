"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  PhoneCall,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/store/authStore";

type RecordType =
  | "agendamento"
  | "ficticio"
  | "cancelamento"
  | "comercial_ligacoes"
  | "exames_ligacoes";

type TabKey =
  | "dashboard"
  | "agendamentos"
  | "ficticios"
  | "pagamentos"
  | "cancelamentos"
  | "comercial-ligacoes"
  | "exames-ligacoes"
  | "novo";

type PaymentStatus = "nao_aplica" | "a_pagar" | "pago";
type CallStatus = "venda_feita" | "venda_nao_realizada";

type OperationalRecord = {
  id: string;
  patientName: string;
  contractId?: string;
  plan: string;
  phone: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  city?: string;
  type: RecordType;
  date: string;
  time?: string;
  clinic?: string;
  specialty?: string;
  attendant: string;
  commercialOwner?: string;
  status: string;
  observation: string;
  cancellationReason?: string;
  needsPayment: boolean;
  paymentStatus: PaymentStatus;
  paymentAmount?: string;
  paymentDueDate?: string;
  paymentDueTime?: string;
  callStatus?: CallStatus;
  updatedAt: string;
};

type Filters = {
  search: string;
  status: string;
  attendant: string;
  clinic: string;
  city: string;
  plan: string;
  date: string;
};

type UserOption = {
  id: string;
  email: string;
  role: string;
};

type PaginationState = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const PAGE_SIZE = 10;

const tabs: { key: TabKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "agendamentos", label: "Agendamentos" },
  { key: "ficticios", label: "Ficticios" },
  { key: "pagamentos", label: "Pagamentos" },
  { key: "cancelamentos", label: "Cancelamentos" },
  { key: "comercial-ligacoes", label: "Comercial Ligacoes" },
  { key: "exames-ligacoes", label: "Exames Ligacoes" },
  { key: "novo", label: "Novo Registro" },
];

const PLAN_OPTIONS = ["Plano Light", "Plus R$ 9,90", "Plus Gratuito"] as const;

const tabKeys = new Set<TabKey>(tabs.map((tab) => tab.key));

function resolveTab(value: string | null): TabKey {
  return value && tabKeys.has(value as TabKey) ? (value as TabKey) : "dashboard";
}

const statusOptionsByType: Record<RecordType, string[]> = {
  agendamento: [
    "Verificando agendamento",
    "Agendado, falta enviar voucher",
    "Voucher enviado",
    "Aguardando agenda abrir",
  ],
  ficticio: [
    "Verificando agendamento",
    "Reagendado, falta enviar o voucher",
    "Cliente avisado",
    "Voucher enviado",
    "Aguardando agenda abrir",
  ],
  cancelamento: ["Cancelado"],
  comercial_ligacoes: ["Venda feita", "Venda nao realizada"],
  exames_ligacoes: ["Venda feita", "Venda nao realizada"],
};

const initialFilters: Filters = {
  search: "",
  status: "",
  attendant: "",
  clinic: "",
  city: "",
  plan: "",
  date: "",
};

type ApiOperationalRecord = {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_cpf?: string | null;
  patient_birth_date?: string | null;
  patient_email?: string | null;
  patient_city?: string | null;
  contract_id?: string | null;
  plan_name: string;
  record_type: RecordType;
  status: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  clinic_name?: string | null;
  specialty_name?: string | null;
  attendant_email: string;
  commercial_owner_email?: string | null;
  needs_payment: boolean;
  payment_status: PaymentStatus;
  payment_amount?: number | null;
  payment_due_date?: string | null;
  payment_due_time?: string | null;
  call_status?: CallStatus | null;
  cancellation_reason?: string | null;
  observation?: string | null;
  updated_at?: string | null;
};

function formatRelativeDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mapApiRecordToUi(record: ApiOperationalRecord): OperationalRecord {
  return {
    id: record.id,
    patientName: record.patient_name,
    contractId: record.contract_id || "",
    plan: record.plan_name,
    phone: formatPhone(record.patient_phone),
    cpf: formatCpf(record.patient_cpf || ""),
    birthDate: record.patient_birth_date || "",
    email: record.patient_email || "",
    city: record.patient_city || "",
    type: record.record_type,
    date: record.appointment_date || "",
    time: record.appointment_time || "",
    clinic: record.clinic_name || "",
    specialty: record.specialty_name || "",
    attendant: record.attendant_email,
    commercialOwner: record.commercial_owner_email || "",
    status: record.status,
    observation: record.observation || "",
    cancellationReason: record.cancellation_reason || "",
    needsPayment: Boolean(record.needs_payment),
    paymentStatus: record.payment_status,
    paymentAmount:
      typeof record.payment_amount === "number"
        ? record.payment_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "",
    paymentDueDate: record.payment_due_date || "",
    paymentDueTime: record.payment_due_time || "",
    callStatus: record.call_status || undefined,
    updatedAt: formatRelativeDateTime(record.updated_at) || "Agora",
  };
}

function mapUiRecordToApi(record: OperationalRecord, actorUserEmail?: string) {
  return {
    patient_name: record.patientName,
    patient_phone: record.phone,
    patient_cpf: record.cpf || null,
    patient_birth_date: record.birthDate || null,
    patient_email: record.email || null,
    patient_city: record.city || null,
    contract_id: record.contractId || null,
    plan_name: record.plan,
    record_type: record.type,
    status: record.status,
    appointment_date: record.date || null,
    appointment_time: record.time || null,
    clinic_name: record.clinic || null,
    specialty_name: record.specialty || null,
    attendant_email: record.attendant || null,
    commercial_owner_email: record.commercialOwner || null,
    needs_payment: record.needsPayment,
    payment_status: record.paymentStatus,
    payment_amount: record.paymentAmount || null,
    payment_due_date: record.paymentDueDate || null,
    payment_due_time: record.paymentDueTime || null,
    call_status: record.callStatus || null,
    cancellation_reason: record.cancellationReason || null,
    observation: record.observation || "",
    actor_user_email: actorUserEmail || null,
  };
}

async function loadOperationalRecords() {
  const response = await fetch("/api/agendamento/gestao?limit=200", { cache: "no-store" });
  if (!response.ok) throw new Error("Erro ao carregar registros operacionais");
  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map(mapApiRecordToUi);
}

async function loadPaginatedOperationalRecords(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/agendamento/gestao?${searchParams.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Erro ao carregar registros operacionais");
  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return {
    data: rows.map(mapApiRecordToUi),
    pagination: {
      total: Number(payload?.pagination?.total ?? 0),
      limit: Number(payload?.pagination?.limit ?? PAGE_SIZE),
      offset: Number(payload?.pagination?.offset ?? 0),
      hasMore: Boolean(payload?.pagination?.hasMore),
    } satisfies PaginationState,
  };
}

async function saveOperationalRecord(payload: OperationalRecord, actorUserEmail?: string) {
  const response = await fetch("/api/agendamento/gestao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapUiRecordToApi(payload, actorUserEmail)),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error || "Erro ao salvar registro");
  }

  const data = (await response.json()) as ApiOperationalRecord;
  return mapApiRecordToUi(data);
}

async function updateOperationalRecord(id: string, payload: Partial<OperationalRecord>, actorUserEmail?: string) {
  const response = await fetch(`/api/agendamento/gestao/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapUiRecordToApi(payload as OperationalRecord, actorUserEmail)),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error || "Erro ao atualizar registro");
  }

  const data = (await response.json()) as ApiOperationalRecord;
  return mapApiRecordToUi(data);
}

async function loadUserOptions() {
  const response = await fetch("/api/users", { cache: "no-store" });
  if (!response.ok) throw new Error("Erro ao carregar usuarios");
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .map((item) => ({
      id: String(item.id || ""),
      email: String(item.email || "").trim().toLowerCase(),
      role: item.role ? String(item.role) : "",
    }))
    .filter((item): item is UserOption => Boolean(item.id && item.email));
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatPhone(value?: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value?: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function sanitizeAmountInput(value?: string) {
  // Keep the amount field predictable before it reaches the API.
  const sanitized = String(value || "").replace(/[^\d.,]/g, "");
  const firstSeparatorIndex = sanitized.search(/[.,]/);

  if (firstSeparatorIndex === -1) {
    return sanitized;
  }

  const integerPart = sanitized.slice(0, firstSeparatorIndex).replace(/[^\d]/g, "");
  const decimalPart = sanitized
    .slice(firstSeparatorIndex + 1)
    .replace(/[^\d]/g, "")
    .slice(0, 2);

  return `${integerPart},${decimalPart}`;
}

function compareDateTimeAsc(dateA?: string, timeA?: string, dateB?: string, timeB?: string) {
  const left = `${dateA || "9999-12-31"}T${timeA || "23:59:59"}`;
  const right = `${dateB || "9999-12-31"}T${timeB || "23:59:59"}`;
  return left.localeCompare(right);
}

function getTodayInSaoPaulo() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function getYesterdayInSaoPaulo() {
  const now = new Date();
  const saoPauloDate = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
    })
  );
  saoPauloDate.setDate(saoPauloDate.getDate() - 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(saoPauloDate);
}

function formatDailyComparison(current: number, previous: number) {
  if (previous === 0 && current === 0) return "0% vs ontem";
  if (previous === 0) return "+100% vs ontem";

  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return "0% vs ontem";
  return `${percent > 0 ? "+" : ""}${percent}% vs ontem`;
}

function getCurrentTimeInSaoPaulo() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function typeLabel(type: RecordType) {
  const labels: Record<RecordType, string> = {
    agendamento: "Agendamento",
    ficticio: "Ficticio",
    cancelamento: "Cancelamento",
    comercial_ligacoes: "Comercial Ligacoes",
    exames_ligacoes: "Exames Ligacoes",
  };
  return labels[type];
}

function uniqueValues(records: OperationalRecord[], selector: (record: OperationalRecord) => string | undefined) {
  return Array.from(new Set(records.map(selector).filter((value): value is string => Boolean(value)))).sort(
    (a, b) => a.localeCompare(b, "pt-BR")
  );
}

function uniqueNormalizedValues(records: OperationalRecord[], selector: (record: OperationalRecord) => string | undefined) {
  const map = new Map<string, string>();

  for (const value of records.map(selector).filter((item): item is string => Boolean(item?.trim()))) {
    const trimmed = value.trim();
    const key = normalize(trimmed);
    if (!map.has(key)) {
      map.set(key, trimmed);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function matchesFilters(record: OperationalRecord, filters: Filters) {
  const haystack = normalize(
    [
      record.patientName,
      record.contractId,
      record.phone,
      record.plan,
      record.clinic,
      record.attendant,
      record.status,
      record.observation,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (filters.search && !haystack.includes(normalize(filters.search))) return false;
  if (filters.status && record.status !== filters.status) return false;
  if (filters.attendant && record.attendant !== filters.attendant) return false;
  if (filters.clinic && record.clinic !== filters.clinic) return false;
  if (filters.city && normalize(record.city || "") !== normalize(filters.city)) return false;
  if (filters.plan && record.plan !== filters.plan) return false;
  if (filters.date && record.date !== filters.date) return false;
  return true;
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
      )}
    >
      {children}
    </button>
  );
}

function UserEmailSelect({
  name,
  value,
  onChange,
  users,
  placeholder,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  users: UserOption[];
  placeholder: string;
}) {
  return (
    <select
      name={name}
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {users.map((user) => (
        <option key={user.id} value={user.email}>
          {user.email}
        </option>
      ))}
    </select>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "green" | "blue" | "yellow" | "red" | "purple" | "teal";
  icon: React.ElementType;
}) {
  const tones = {
    green: "text-green-700 bg-green-50 border-green-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    yellow: "text-yellow-700 bg-yellow-50 border-yellow-100",
    red: "text-red-700 bg-red-50 border-red-100",
    purple: "text-purple-700 bg-purple-50 border-purple-100",
    teal: "text-teal-700 bg-teal-50 border-teal-100",
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <small className="text-sm font-medium text-slate-500">{label}</small>
        <span className={cn("rounded-xl border p-2", tones[tone])}>
          <Icon size={18} />
        </span>
      </div>
      <strong className="block text-3xl font-semibold text-slate-900">{value}</strong>
      <span className={cn("mt-3 block text-sm font-semibold", tones[tone].split(" ")[0])}>{hint}</span>
    </div>
  );
}

function FiltersPanel({
  records,
  filters,
  onChange,
  statuses,
  showClinic = true,
  showCity = true,
  showPlan = true,
}: {
  records: OperationalRecord[];
  filters: Filters;
  statuses: string[];
  showClinic?: boolean;
  showCity?: boolean;
  showPlan?: boolean;
  onChange: (filters: Filters) => void;
}) {
  const attendants = uniqueValues(records, (record) => record.attendant);
  const clinics = uniqueValues(records, (record) => record.clinic);
  const cities = uniqueNormalizedValues(records, (record) => record.city);
  const plans = uniqueValues(records, (record) => record.plan);
  const patch = (next: Partial<Filters>) => onChange({ ...filters, ...next });

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal size={18} className="text-blue-600" />
        <h3 className="text-base font-semibold text-slate-900">Filtros</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-400"
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
            placeholder="Buscar por Id, nome ou telefone"
          />
        </label>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" value={filters.status} onChange={(event) => patch({ status: event.target.value })}>
          <option value="">Status</option>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" value={filters.attendant} onChange={(event) => patch({ attendant: event.target.value })}>
          <option value="">Atendente</option>
          {attendants.map((attendant) => <option key={attendant} value={attendant}>{attendant}</option>)}
        </select>
        {showClinic && (
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" value={filters.clinic} onChange={(event) => patch({ clinic: event.target.value })}>
            <option value="">Clinica</option>
            {clinics.map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}
          </select>
        )}
        {showCity && (
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" value={filters.city} onChange={(event) => patch({ city: event.target.value })}>
            <option value="">Unidade/Cidade</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        )}
        {showPlan && (
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" value={filters.plan} onChange={(event) => patch({ plan: event.target.value })}>
            <option value="">Plano</option>
            {plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
          </select>
        )}
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" type="date" value={filters.date} onChange={(event) => patch({ date: event.target.value })} />
      </div>
    </div>
  );
}

function StatusSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function RecordsTable({
  title,
  records,
  mode,
  onOpen,
  onPatch,
  loading = false,
  pagination,
  currentPage,
  onPageChange,
}: {
  title: string;
  records: OperationalRecord[];
  mode: "standard" | "payment" | "cancelamento" | "call";
  onOpen: (record: OperationalRecord) => void;
  onPatch: (id: string, patch: Partial<OperationalRecord>) => void;
  loading?: boolean;
  pagination?: PaginationState;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {pagination ? `${pagination.total} registros` : `${records.length} registros`}
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Paciente</th>
              <th className="px-3 py-3">Plano</th>
              {mode !== "payment" && <th className="px-3 py-3">Telefone</th>}
              {mode === "payment" && <th className="px-3 py-3">Tipo</th>}
              {mode !== "call" && mode !== "cancelamento" && (
                <th className="px-3 py-3">{mode === "payment" ? "Data pagamento" : "Data"}</th>
              )}
              {mode === "standard" && <th className="px-3 py-3">Horario</th>}
              {mode === "payment" && <th className="px-3 py-3">Horario</th>}
              {(mode === "standard" || mode === "payment") && <th className="px-3 py-3">Clinica</th>}
              <th className="px-3 py-3">Especialidade</th>
              {mode === "standard" && <th className="px-3 py-3">Unidade/Cidade</th>}
              <th className="px-3 py-3">Atendente</th>
              {mode === "payment" && <th className="px-3 py-3">Valor</th>}
              {mode === "payment" && <th className="px-3 py-3">Pagamento</th>}
              {mode === "cancelamento" && <th className="px-3 py-3">Motivo</th>}
              {mode !== "payment" && mode !== "cancelamento" && <th className="px-3 py-3">Status</th>}
              {mode !== "payment" && mode !== "cancelamento" && <th className="px-3 py-3">Observacao</th>}
              <th className="px-3 py-3">Acao</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-slate-100 text-sm text-slate-700">
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">{record.patientName}</td>
                <td className="whitespace-nowrap px-3 py-3">{record.plan}</td>
                {mode !== "payment" && <td className="whitespace-nowrap px-3 py-3">{record.phone}</td>}
                {mode === "payment" && <td className="whitespace-nowrap px-3 py-3">{typeLabel(record.type)}</td>}
                {mode !== "call" && mode !== "cancelamento" && (
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDate(mode === "payment" ? record.paymentDueDate : record.date)}
                  </td>
                )}
                {mode === "standard" && <td className="whitespace-nowrap px-3 py-3">{record.time || "-"}</td>}
                {mode === "payment" && <td className="whitespace-nowrap px-3 py-3">{record.paymentDueTime || "-"}</td>}
                {(mode === "standard" || mode === "payment") && <td className="whitespace-nowrap px-3 py-3">{record.clinic || "-"}</td>}
                <td className="whitespace-nowrap px-3 py-3">{record.specialty || "-"}</td>
                {mode === "standard" && <td className="whitespace-nowrap px-3 py-3">{record.city || "-"}</td>}
                <td className="whitespace-nowrap px-3 py-3">{record.attendant}</td>
                {mode === "payment" && <td className="whitespace-nowrap px-3 py-3">{record.paymentAmount || "-"}</td>}
                {mode === "payment" && (
                  <td className="px-3 py-3">
                    <StatusSelect value={record.paymentStatus} options={["a_pagar", "pago"]} onChange={(value) => onPatch(record.id, { paymentStatus: value as PaymentStatus })} />
                  </td>
                )}
                {mode === "cancelamento" && (
                  <td className="min-w-64 px-3 py-3">
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" value={record.cancellationReason || ""} onChange={(event) => onPatch(record.id, { cancellationReason: event.target.value })} />
                  </td>
                )}
                {mode !== "payment" && mode !== "cancelamento" && (
                  <td className="px-3 py-3">
                    <StatusSelect
                      value={record.status}
                      options={statusOptionsByType[record.type]}
                      onChange={(value) =>
                        onPatch(record.id, {
                          status: value,
                          callStatus: value === "Venda feita" ? "venda_feita" : value === "Venda nao realizada" ? "venda_nao_realizada" : record.callStatus,
                        })
                      }
                    />
                  </td>
                )}
                {mode !== "payment" && mode !== "cancelamento" && (
                  <td className="min-w-72 px-3 py-3">
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" value={record.observation} onChange={(event) => onPatch(record.id, { observation: event.target.value })} />
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-3">
                  <button type="button" onClick={() => onOpen(record)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
                    Abrir ficha
                  </button>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-sm text-slate-500">
                  Carregando registros...
                </td>
              </tr>
            )}
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nenhum registro encontrado para os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && onPageChange && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-500">
            Pagina {currentPage || 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, (currentPage || 1) - 1))}
              disabled={(currentPage || 1) <= 1 || loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, (currentPage || 1) + 1))}
              disabled={!pagination.hasMore || loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({
  records,
  onOpen,
}: {
  records: OperationalRecord[];
  onOpen: (record: OperationalRecord) => void;
}) {
  const today = getTodayInSaoPaulo();
  const yesterday = getYesterdayInSaoPaulo();
  const agendamentosHoje = records.filter((record) => record.type === "agendamento" && record.date === today);
  const agendamentosOntem = records.filter((record) => record.type === "agendamento" && record.date === yesterday);
  const ficticiosHoje = records.filter((record) => record.type === "ficticio" && record.date === today);
  const ficticiosOntem = records.filter((record) => record.type === "ficticio" && record.date === yesterday);
  const payments = records.filter((record) => record.needsPayment && record.paymentStatus === "a_pagar");
  const cancelamentos = records.filter((record) => record.type === "cancelamento");
  const cancelamentosHoje = cancelamentos.filter((record) => record.date === today);
  const cancelamentosOntem = cancelamentos.filter((record) => record.date === yesterday);
  const comercial = records.filter((record) => record.type === "comercial_ligacoes");
  const exames = records.filter((record) => record.type === "exames_ligacoes");
  const pagamentosVencemHoje = payments.filter((record) => (record.paymentDueDate || "") === today).length;
  const vendasComercialFeitas = comercial.filter((record) => record.status === "Venda feita").length;
  const vendasExamesNaoRealizadas = exames.filter((record) => record.status === "Venda nao realizada").length;

  const sortedAgendamentos = [...records.filter((record) => record.type === "agendamento")].sort((left, right) =>
    compareDateTimeAsc(left.date, left.time, right.date, right.time)
  );
  const sortedFicticios = [...records.filter((record) => record.type === "ficticio")].sort((left, right) =>
    compareDateTimeAsc(left.date, left.time, right.date, right.time)
  );
  const sortedPayments = [...payments].sort((left, right) =>
    compareDateTimeAsc(left.paymentDueDate || left.date, left.paymentDueTime || left.time, right.paymentDueDate || right.date, right.paymentDueTime || right.time)
  );
  const sortedCancelamentos = [...cancelamentos].sort((left, right) =>
    compareDateTimeAsc(left.date, left.time, right.date, right.time)
  );
  const kanban = [
    { title: "Agendamentos", records: sortedAgendamentos },
    { title: "Ficticios", records: sortedFicticios },
    { title: "Consultas a pagar", records: sortedPayments },
    { title: "Cancelamentos", records: sortedCancelamentos },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none">
          <option>Filtrar por atendente</option>
          {uniqueValues(records, (record) => record.attendant).map((name) => <option key={name}>{name}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none">
          <option>Periodo</option>
          <option>Hoje</option>
          <option>Ultimos 7 dias</option>
          <option>Este mes</option>
        </select>
        <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none">
          <option>Clinica</option>
          {uniqueValues(records, (record) => record.clinic).map((clinic) => <option key={clinic}>{clinic}</option>)}
        </select>
        <button className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Aplicar filtros</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Agendamentos do dia"
          value={agendamentosHoje.length}
          hint={formatDailyComparison(agendamentosHoje.length, agendamentosOntem.length)}
          tone="green"
          icon={CalendarDays}
        />
        <MetricCard
          label="Ficticios hoje"
          value={ficticiosHoje.length}
          hint={formatDailyComparison(ficticiosHoje.length, ficticiosOntem.length)}
          tone="blue"
          icon={FileText}
        />
        <MetricCard
          label="Consultas a pagar"
          value={payments.length}
          hint={pagamentosVencemHoje > 0 ? `${pagamentosVencemHoje} vencem hoje` : "Sem vencimento hoje"}
          tone="yellow"
          icon={CreditCard}
        />
        <MetricCard
          label="Cancelamentos"
          value={cancelamentosHoje.length}
          hint={formatDailyComparison(cancelamentosHoje.length, cancelamentosOntem.length)}
          tone="red"
          icon={XCircle}
        />
        <MetricCard
          label="Comercial ligacoes"
          value={comercial.length}
          hint={vendasComercialFeitas > 0 ? `${vendasComercialFeitas} vendas feitas` : "Nenhuma venda feita"}
          tone="purple"
          icon={PhoneCall}
        />
        <MetricCard
          label="Exames ligacoes"
          value={exames.length}
          hint={
            vendasExamesNaoRealizadas > 0
              ? `${vendasExamesNaoRealizadas} vendas nao realizadas`
              : "Nenhuma perda em exames"
          }
          tone="teal"
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="h-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Fluxo operacional</h3>
            <span className="text-sm text-slate-500">Status separados por area</span>
          </div>
          <div className="grid h-[440px] grid-cols-1 gap-4 overflow-hidden md:grid-cols-2 xl:grid-cols-4">
            {kanban.map((column) => (
              <div key={column.title} className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">{column.title}</h4>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {column.records.length > 0 ? (
                    column.records.slice(0, 4).map((record) => (
                      <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <strong className="block text-sm text-slate-900">{record.patientName}</strong>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Status: {record.status}
                          <br />
                          {column.title === "Consultas a pagar"
                            ? `Pagamento: ${formatDate(record.paymentDueDate)} ${record.paymentDueTime || ""}`.trim()
                            : record.observation || record.cancellationReason || "Sem observacoes"}
                        </p>
                        <button
                          type="button"
                          onClick={() => onOpen(record)}
                          className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Abrir ficha
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500">
                      Nenhum registro nesta area.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Ultimas movimentacoes</h3>
          <div className="h-[440px] space-y-4 overflow-y-auto pr-1">
            {records.map((record) => (
              <div key={record.id} className="border-l-4 border-blue-500 pl-3">
                <strong className="block text-sm text-slate-900">
                  {record.attendant} atualizou {record.patientName} para &quot;{record.status}&quot;
                </strong>
                <span className="mt-1 block text-xs text-slate-500">{record.updatedAt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewRecordView({
  onSave,
  currentUserEmail,
}: {
  onSave: (record: OperationalRecord) => Promise<void>;
  currentUserEmail: string;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("type") || "agendamento") as RecordType;
    const needsPayment = form.get("needsPayment") === "Sim";
    const record: OperationalRecord = {
      id: `op-${Date.now()}`,
      patientName: String(form.get("patientName") || "Novo paciente"),
      contractId: String(form.get("contractId") || ""),
      phone: String(form.get("phone") || ""),
      cpf: String(form.get("cpf") || ""),
      birthDate: String(form.get("birthDate") || ""),
      email: String(form.get("email") || ""),
      plan: String(form.get("plan") || PLAN_OPTIONS[0]),
      city: String(form.get("city") || ""),
      type,
      date: String(form.get("date") || ""),
      time: String(form.get("time") || ""),
      clinic: String(form.get("clinic") || ""),
      specialty: String(form.get("specialty") || ""),
      attendant: currentUserEmail,
      status: statusOptionsByType[type][0],
      observation: String(form.get("observation") || ""),
      cancellationReason: String(form.get("cancellationReason") || ""),
      needsPayment,
      paymentStatus: needsPayment ? "a_pagar" : "nao_aplica",
      paymentAmount: String(form.get("paymentAmount") || ""),
      paymentDueDate: String(form.get("paymentDueDate") || ""),
      paymentDueTime: String(form.get("paymentDueTime") || ""),
      callStatus: type.includes("ligacoes") ? "venda_nao_realizada" : undefined,
      updatedAt: "Agora",
    };

    setSaving(true);
    try {
      await onSave(record);
      formElement.reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Novo registro</h1>
        <p className="mt-1 text-sm text-slate-500">Formulario unico com os novos tipos operacionais do sistema.</p>

        <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-500">Dados do paciente</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input name="patientName" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Nome do paciente" />
          <input name="contractId" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="ID do contrato" />
          <input
            name="phone"
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            placeholder="(11) 99999-9999"
            onChange={(event) => {
              event.currentTarget.value = formatPhone(event.currentTarget.value);
            }}
          />
          <input
            name="cpf"
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            placeholder="111.111.111-11"
            onChange={(event) => {
              event.currentTarget.value = formatCpf(event.currentTarget.value);
            }}
          />
          <input name="birthDate" type="date" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          <input name="email" type="email" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="E-mail" />
          <select name="plan" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" defaultValue={PLAN_OPTIONS[0]}>
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
          <input name="city" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Cidade / Unidade" />
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-500">Tipo principal do registro</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select name="type" className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
            <option value="agendamento">Agendamento</option>
            <option value="ficticio">Ficticio</option>
            <option value="cancelamento">Cancelamento</option>
            <option value="comercial_ligacoes">Comercial Ligacoes</option>
            <option value="exames_ligacoes">Exames Ligacoes</option>
          </select>
          <select name="needsPayment" className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
            <option>Nao</option>
            <option>Sim</option>
          </select>
          <input
            name="date"
            type="date"
            defaultValue={getTodayInSaoPaulo()}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
          />
          <input
            name="time"
            type="time"
            defaultValue={getCurrentTimeInSaoPaulo()}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            placeholder="Horario da consulta"
          />
          <input name="clinic" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Clinica" />
          <input name="specialty" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Especialidade" />
          <input
            readOnly
            value={currentUserEmail}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600"
            placeholder="Email do atendente"
          />
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-500">Campos operacionais</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            name="paymentAmount"
            inputMode="decimal"
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            placeholder="Valor da consulta"
            onChange={(event) => {
              event.currentTarget.value = sanitizeAmountInput(event.currentTarget.value);
            }}
          />
          <input name="paymentDueDate" type="date" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" />
          <input name="paymentDueTime" type="time" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Horario do pagamento" />
          <select name="callStatus" className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
            <option>Venda feita</option>
            <option>Venda nao realizada</option>
          </select>
          <input name="cancellationReason" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Motivo do cancelamento" />
          <textarea name="observation" rows={4} className="rounded-xl border border-slate-200 px-3 py-3 text-sm md:col-span-2" placeholder="Observacao do operador sobre o atendimento" />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            {saving ? "Salvando..." : "Salvar registro"}
          </button>
          <button type="reset" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Limpar</button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Regras do fluxo</h3>
        {[
          ["Duas novas areas de registro", "Comercial Ligacoes e Exames Ligacoes registram todos os atendimentos."],
          ["Status simples para ligacoes", "As duas novas abas usam apenas Venda feita e Venda nao realizada."],
          ["Dashboard filtravel por atendente", "A gestao consegue enxergar os numeros gerais e filtrar por operador."],
          ["Filtros em todas as abas", "Cada aba tem filtro por status e atendente para facilitar a operacao."],
        ].map(([title, text]) => (
          <div key={title} className="mb-4 border-l-4 border-blue-500 pl-3">
            <strong className="block text-sm text-slate-900">{title}</strong>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientDrawer({
  record,
  onClose,
  onSave,
  users,
}: {
  record: OperationalRecord | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<OperationalRecord>) => void;
  users: UserOption[];
}) {
  const [draft, setDraft] = useState<OperationalRecord | null>(record);

  useEffect(() => {
    setDraft(record);
  }, [record]);

  if (!record || !draft) return null;

  const patch = (next: Partial<OperationalRecord>) => {
    setDraft((current) => (current ? { ...current, ...next } : current));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">Ficha de {record.patientName}</h3>
            <p className="mt-1 text-sm text-slate-500">Visualize e edite todos os dados do paciente e do atendimento.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar ficha" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <h4 className="mb-3 text-sm font-semibold text-slate-500">Dados pessoais</h4>
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.patientName} onChange={(event) => patch({ patientName: event.target.value })} />
          <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.contractId || ""} onChange={(event) => patch({ contractId: event.target.value })} placeholder="ID do contrato" />
          <input
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            value={draft.phone}
            onChange={(event) => patch({ phone: formatPhone(event.target.value) })}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            value={draft.cpf || ""}
            onChange={(event) => patch({ cpf: formatCpf(event.target.value) })}
          />
          <input type="date" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.birthDate || ""} onChange={(event) => patch({ birthDate: event.target.value })} />
          <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.email || ""} onChange={(event) => patch({ email: event.target.value })} />
          <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.plan} onChange={(event) => patch({ plan: event.target.value })}>
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
          <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.city || ""} onChange={(event) => patch({ city: event.target.value })} />
        </div>

        <h4 className="mb-3 text-sm font-semibold text-slate-500">Dados do atendimento</h4>
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            value={draft.type}
            onChange={(event) => {
              const nextType = event.target.value as RecordType;
              patch({
                type: nextType,
                status: statusOptionsByType[nextType][0],
                callStatus:
                  nextType === "comercial_ligacoes" || nextType === "exames_ligacoes"
                    ? "venda_nao_realizada"
                    : undefined,
              });
            }}
          >
            <option value="agendamento">Agendamento</option>
            <option value="ficticio">Ficticio</option>
            <option value="cancelamento">Cancelamento</option>
            <option value="comercial_ligacoes">Comercial Ligacoes</option>
            <option value="exames_ligacoes">Exames Ligacoes</option>
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.needsPayment ? "Sim" : "Nao"} onChange={(event) => patch({ needsPayment: event.target.value === "Sim" })}>
            <option>Nao</option>
            <option>Sim</option>
          </select>
          <input type="date" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.date} onChange={(event) => patch({ date: event.target.value })} />
          <input type="time" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.time || ""} onChange={(event) => patch({ time: event.target.value })} />
          <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.clinic || ""} onChange={(event) => patch({ clinic: event.target.value })} />
          <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.specialty || ""} onChange={(event) => patch({ specialty: event.target.value })} placeholder="Especialidade" />
          <UserEmailSelect value={draft.attendant} onChange={(value) => patch({ attendant: value })} users={users} placeholder="Email do atendente" />
          <UserEmailSelect value={draft.commercialOwner || ""} onChange={(value) => patch({ commercialOwner: value })} users={users} placeholder="Email comercial/responsavel" />
        </div>

        <h4 className="mb-3 text-sm font-semibold text-slate-500">Acompanhamento</h4>
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            inputMode="decimal"
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            value={draft.paymentAmount || ""}
            onChange={(event) => patch({ paymentAmount: sanitizeAmountInput(event.target.value) })}
          />
          <input type="date" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.paymentDueDate || ""} onChange={(event) => patch({ paymentDueDate: event.target.value })} />
          <input type="time" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.paymentDueTime || ""} onChange={(event) => patch({ paymentDueTime: event.target.value })} />
          <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.status} onChange={(event) => patch({ status: event.target.value })}>
            {statusOptionsByType[draft.type].map((status) => <option key={status}>{status}</option>)}
          </select>
          <input className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={draft.cancellationReason || ""} onChange={(event) => patch({ cancellationReason: event.target.value })} placeholder="Motivo do cancelamento" />
          <textarea rows={4} className="rounded-xl border border-slate-200 px-3 py-3 text-sm md:col-span-2" value={draft.observation} onChange={(event) => patch({ observation: event.target.value })} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              onSave(record.id, draft);
              onClose();
            }}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Salvar alteracoes
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            Fechar
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function GestaoAgendamentosTestePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const activeTab = resolveTab(searchParams.get("tab"));
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [listRecords, setListRecords] = useState<OperationalRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedRecord, setSelectedRecord] = useState<OperationalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });

  const isServerPaginatedTab =
    activeTab === "agendamentos" ||
    activeTab === "ficticios" ||
    activeTab === "pagamentos" ||
    activeTab === "cancelamentos" ||
    activeTab === "comercial-ligacoes" ||
    activeTab === "exames-ligacoes";

  async function refreshDashboardRecords() {
    const nextRecords = await loadOperationalRecords();
    setRecords(nextRecords);
  }

  const refreshListRecords = useCallback(async (page = currentPage) => {
    if (!isServerPaginatedTab) return;

    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
    };

    if (filters.search) params.search = filters.search;
    if (filters.attendant) params.attendant_email = filters.attendant;
    if (filters.clinic) params.clinic_name = filters.clinic;
    if (filters.city) params.patient_city = filters.city;
    if (filters.plan) params.plan_name = filters.plan;
    if (filters.date) params.appointment_date = filters.date;

    if (activeTab === "agendamentos") {
      params.record_type = "agendamento";
      if (filters.status) params.status = filters.status;
    }

    if (activeTab === "ficticios") {
      params.record_type = "ficticio";
      if (filters.status) params.status = filters.status;
    }

    if (activeTab === "pagamentos") {
      params.needs_payment = "true";
      if (filters.status) params.payment_status = filters.status;
    }

    if (activeTab === "cancelamentos") {
      params.record_type = "cancelamento";
      if (filters.status) params.status = filters.status;
    }

    if (activeTab === "comercial-ligacoes") {
      params.record_type = "comercial_ligacoes";
      if (filters.status) params.status = filters.status;
    }

    if (activeTab === "exames-ligacoes") {
      params.record_type = "exames_ligacoes";
      if (filters.status) params.status = filters.status;
    }

    setListLoading(true);
    try {
      const response = await loadPaginatedOperationalRecords(params);
      setListRecords(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error(error);
      setListRecords([]);
      setPagination({
        total: 0,
        limit: PAGE_SIZE,
        offset: 0,
        hasMore: false,
      });
    } finally {
      setListLoading(false);
    }
  }, [activeTab, currentPage, filters, isServerPaginatedTab]);

  useEffect(() => {
    loadUserOptions().then(setUsers).catch(console.error);
    refreshDashboardRecords()
      .catch((error) => {
        console.error(error);
        setRecords([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isServerPaginatedTab) return;
    refreshListRecords(currentPage).catch(console.error);
  }, [currentPage, isServerPaginatedTab, refreshListRecords]);

  function updateRecord(id: string, patch: Partial<OperationalRecord>) {
    setRecords((current) =>
      current.map((record) => (record.id === id ? { ...record, ...patch, updatedAt: "Agora" } : record))
    );
    setListRecords((current) =>
      current.map((record) => (record.id === id ? { ...record, ...patch, updatedAt: "Agora" } : record))
    );

    const currentRecord = records.find((record) => record.id === id);
    if (!currentRecord) return;

    updateOperationalRecord(id, { ...currentRecord, ...patch }, String(user?.email || ""))
      .then((saved) => {
        setRecords((current) => current.map((record) => (record.id === id ? saved : record)));
        setListRecords((current) => current.map((record) => (record.id === id ? saved : record)));
      })
      .catch((error) => {
        console.error(error);
        refreshDashboardRecords().catch(console.error);
        refreshListRecords(currentPage).catch(console.error);
      });
  }

  async function createRecord(record: OperationalRecord) {
    const saved = await saveOperationalRecord(record, String(user?.email || ""));
    setRecords((current) => [saved, ...current]);
    router.push("/portal/agendamento/gestao-teste?tab=dashboard");
  }

  const recordsForTab = useMemo(() => {
    const byTab: Record<TabKey, OperationalRecord[]> = {
      dashboard: records,
      agendamentos: listRecords,
      ficticios: listRecords,
      pagamentos: listRecords,
      cancelamentos: listRecords,
      "comercial-ligacoes": listRecords,
      "exames-ligacoes": listRecords,
      novo: records,
    };

    if (activeTab === "dashboard" || activeTab === "novo") {
      return byTab[activeTab].filter((record) => matchesFilters(record, filters));
    }

    return byTab[activeTab];
  }, [activeTab, filters, listRecords, records]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          <Clock3 className="animate-spin text-blue-600" size={18} />
          Carregando gestao de agendamentos...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-slate-50">
      <div className="mx-auto flex min-w-0 max-w-450 flex-col gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.key}
                  active={activeTab === tab.key}
                  onClick={() => {
                    setFilters(initialFilters);
                    setCurrentPage(1);
                    router.push(`/portal/agendamento/gestao-teste?tab=${tab.key}`);
                  }}
                >
                  {tab.label}
                </TabButton>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                <Download size={16} />
                Exportar
              </button>
              <button
                type="button"
                onClick={() => router.push("/portal/agendamento/gestao-teste?tab=novo")}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus size={16} />
                Novo registro
              </button>
            </div>
          </div>
        </div>

        {activeTab === "dashboard" && (
          <DashboardView
            records={records}
            onOpen={setSelectedRecord}
          />
        )}
        {activeTab === "agendamentos" && (
          <>
            <FiltersPanel records={records} filters={filters} onChange={(next) => { setFilters(next); setCurrentPage(1); }} statuses={statusOptionsByType.agendamento} />
            <RecordsTable title="Lista de agendamentos" records={recordsForTab} mode="standard" onOpen={setSelectedRecord} onPatch={updateRecord} loading={listLoading} pagination={pagination} currentPage={currentPage} onPageChange={setCurrentPage} />
          </>
        )}
        {activeTab === "ficticios" && (
          <>
            <FiltersPanel records={records} filters={filters} onChange={(next) => { setFilters(next); setCurrentPage(1); }} statuses={statusOptionsByType.ficticio} />
            <RecordsTable title="Lista de ficticios" records={recordsForTab} mode="standard" onOpen={setSelectedRecord} onPatch={updateRecord} loading={listLoading} pagination={pagination} currentPage={currentPage} onPageChange={setCurrentPage} />
          </>
        )}
        {activeTab === "pagamentos" && (
          <>
            <FiltersPanel records={records} filters={filters} onChange={(next) => { setFilters(next); setCurrentPage(1); }} statuses={["a_pagar", "pago"]} />
            <RecordsTable title="Consultas a pagar" records={recordsForTab} mode="payment" onOpen={setSelectedRecord} onPatch={updateRecord} loading={listLoading} pagination={pagination} currentPage={currentPage} onPageChange={setCurrentPage} />
          </>
        )}
        {activeTab === "cancelamentos" && (
          <>
            <FiltersPanel records={records} filters={filters} onChange={(next) => { setFilters(next); setCurrentPage(1); }} statuses={["Cancelado"]} showClinic={false} />
            <RecordsTable title="Motivos registrados" records={recordsForTab} mode="cancelamento" onOpen={setSelectedRecord} onPatch={updateRecord} loading={listLoading} pagination={pagination} currentPage={currentPage} onPageChange={setCurrentPage} />
          </>
        )}
        {activeTab === "comercial-ligacoes" && (
          <>
            <FiltersPanel records={records} filters={filters} onChange={(next) => { setFilters(next); setCurrentPage(1); }} statuses={statusOptionsByType.comercial_ligacoes} showClinic={false} />
            <RecordsTable title="Clientes atendidos pelo comercial" records={recordsForTab} mode="call" onOpen={setSelectedRecord} onPatch={updateRecord} loading={listLoading} pagination={pagination} currentPage={currentPage} onPageChange={setCurrentPage} />
          </>
        )}
        {activeTab === "exames-ligacoes" && (
          <>
            <FiltersPanel records={records} filters={filters} onChange={(next) => { setFilters(next); setCurrentPage(1); }} statuses={statusOptionsByType.exames_ligacoes} showClinic={false} />
            <RecordsTable title="Clientes atendidos em exames" records={recordsForTab} mode="call" onOpen={setSelectedRecord} onPatch={updateRecord} loading={listLoading} pagination={pagination} currentPage={currentPage} onPageChange={setCurrentPage} />
          </>
        )}
        {activeTab === "novo" && <NewRecordView onSave={createRecord} currentUserEmail={String(user?.email || "")} />}
      </div>

      <PatientDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} onSave={updateRecord} users={users} />
    </div>
  );
}
