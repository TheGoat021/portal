type DocumentType = "voucher" | "declaracao";

type AgendamentoDocumentRecord = {
  id: string;
  patient_name: string | null;
  plan_name: string | null;
  specialty_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  payment_due_date: string | null;
  payment_due_time: string | null;
  clinic_name: string | null;
  patient_city: string | null;
  payment_amount: number | string | null;
  observation: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const amount = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(amount)) return String(value);
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getConsultationDate(record: AgendamentoDocumentRecord) {
  return record.payment_due_date || null;
}

function getConsultationTime(record: AgendamentoDocumentRecord) {
  return record.payment_due_time || null;
}

function getDocumentTitle(documentType: DocumentType) {
  return documentType === "voucher" ? "Voucher de Atendimento" : "Declaracao de Atendimento";
}

function getBodyText(documentType: DocumentType, patientName: string) {
  if (documentType === "voucher") {
    return `Apresente este voucher na unidade no dia da consulta. Paciente: ${patientName}.`;
  }

  return `Declaramos para os devidos fins que ${patientName} podera utilizar este documento para atendimento na unidade informada abaixo.`;
}

export function renderAgendamentoDocumentHtml(
  documentType: DocumentType,
  record: AgendamentoDocumentRecord
) {
  const patientName = escapeHtml(record.patient_name || "Paciente");
  const title = getDocumentTitle(documentType);
  const consultationDate = formatDate(getConsultationDate(record));
  const consultationTime = formatTime(getConsultationTime(record));
  const clinic = escapeHtml(record.clinic_name || "Unidade nao informada");
  const specialty = escapeHtml(record.specialty_name || "Especialidade nao informada");
  const city = escapeHtml(record.patient_city || "Cidade nao informada");
  const plan = escapeHtml(record.plan_name || "Plano nao informado");
  const amount = formatCurrency(record.payment_amount);
  const observation = escapeHtml(record.observation || "Sem observacoes complementares.");
  const bodyText = escapeHtml(getBodyText(documentType, record.patient_name || "o paciente"));

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 32px 20px 60px;
      }
      .toolbar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 20px;
      }
      .print-btn {
        border: 0;
        border-radius: 12px;
        background: #2563eb;
        color: #fff;
        padding: 12px 18px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .sheet {
        background: #fff;
        border: 1px solid #dbe3ee;
        border-radius: 18px;
        padding: 36px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
      }
      .brand {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        margin-bottom: 28px;
      }
      .brand-name {
        font-size: 24px;
        font-weight: 800;
        color: #1d4ed8;
      }
      .brand-sub {
        margin-top: 4px;
        font-size: 13px;
        color: #475569;
      }
      .doc-type {
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }
      h1 {
        margin: 0 0 14px;
        font-size: 30px;
        line-height: 1.15;
      }
      .lead {
        margin: 0 0 24px;
        font-size: 15px;
        line-height: 1.7;
        color: #334155;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }
      .field {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 14px 16px;
        background: #f8fafc;
      }
      .label {
        display: block;
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #64748b;
      }
      .value {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      .notes {
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        background: #fff;
        padding: 18px;
      }
      .notes p {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.7;
        color: #334155;
      }
      .footer {
        margin-top: 28px;
        font-size: 12px;
        color: #64748b;
      }
      @media print {
        body {
          background: #fff;
        }
        .page {
          max-width: none;
          padding: 0;
        }
        .toolbar {
          display: none;
        }
        .sheet {
          border: 0;
          border-radius: 0;
          box-shadow: none;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="toolbar">
        <button class="print-btn" onclick="window.print()">Baixar PDF / Imprimir</button>
      </div>
      <div class="sheet">
        <div class="brand">
          <div>
            <div class="brand-name">Doutor de Todos</div>
            <div class="brand-sub">Documento gerado automaticamente pelo portal interno</div>
          </div>
          <div class="doc-type">${escapeHtml(title)}</div>
        </div>

        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${bodyText}</p>

        <div class="grid">
          <div class="field">
            <span class="label">Paciente</span>
            <span class="value">${patientName}</span>
          </div>
          <div class="field">
            <span class="label">Plano</span>
            <span class="value">${plan}</span>
          </div>
          <div class="field">
            <span class="label">Especialidade</span>
            <span class="value">${specialty}</span>
          </div>
          <div class="field">
            <span class="label">Data da consulta</span>
            <span class="value">${consultationDate}</span>
          </div>
          <div class="field">
            <span class="label">Horario</span>
            <span class="value">${consultationTime}</span>
          </div>
          <div class="field">
            <span class="label">Valor</span>
            <span class="value">${escapeHtml(amount)}</span>
          </div>
          <div class="field">
            <span class="label">Clinica / Unidade</span>
            <span class="value">${clinic}</span>
          </div>
          <div class="field">
            <span class="label">Cidade / Regiao</span>
            <span class="value">${city}</span>
          </div>
        </div>

        <div class="notes">
          <span class="label">Informacoes complementares</span>
          <p>${observation}</p>
        </div>

        <div class="footer">
          Documento emitido eletronicamente. Em caso de divergencia de horario, data ou unidade, confirme o agendamento antes do atendimento.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export type { AgendamentoDocumentRecord, DocumentType };
