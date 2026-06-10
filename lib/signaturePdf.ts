import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { SignatureFont } from "@/types/signatures";

function pickPdfFont(font: SignatureFont) {
  if (font === "elegant") return StandardFonts.TimesRomanItalic;
  if (font === "monospace") return StandardFonts.CourierOblique;
  if (font === "formal") return StandardFonts.Helvetica;
  return StandardFonts.HelveticaOblique;
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) return value;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function drawLabelValueLine(input: {
  page: ReturnType<PDFDocument["addPage"]>;
  label: string;
  value: string;
  x: number;
  y: number;
  labelFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bodyFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}) {
  input.page.drawText(`${input.label}:`, {
    x: input.x,
    y: input.y,
    size: 10.5,
    font: input.labelFont,
    color: rgb(0.12, 0.15, 0.22),
  });

  input.page.drawText(input.value, {
    x: input.x + 92,
    y: input.y,
    size: 10.5,
    font: input.bodyFont,
    color: rgb(0.22, 0.25, 0.31),
  });
}

function wrapText(text: string, maxCharsPerLine: number) {
  const normalized = text.trim();
  if (!normalized) return ["Nao informado"];

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    const chunks = word.match(new RegExp(`.{1,${maxCharsPerLine}}`, "g")) || [word];
    lines.push(...chunks.slice(0, -1));
    current = chunks[chunks.length - 1] || "";
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function generateSignedContractPdf(input: {
  pdfBuffer: Buffer;
  documentTitle: string;
  documentId: string;
  documentCreatedAt: string;
  originalHash: string;
  fullName: string;
  phone: string;
  cpf: string;
  signatureFont: SignatureFont;
  verificationCode: string;
  signedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const pdfDoc = await PDFDocument.load(input.pdfBuffer);
  const reportPage = pdfDoc.addPage([595.28, 841.89]);

  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const signatureFont = await pdfDoc.embedFont(pickPdfFont(input.signatureFont));

  reportPage.drawRectangle({
    x: 28,
    y: 28,
    width: 539,
    height: 785,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.82, 0.84, 0.88),
    borderWidth: 1,
  });

  reportPage.drawText("Relatorio de Assinaturas", {
    x: 44,
    y: 780,
    size: 21,
    font: headingFont,
    color: rgb(0.18, 0.2, 0.24),
  });

  reportPage.drawText("Datas e horarios em UTC-0300 (America/Sao_Paulo)", {
    x: 44,
    y: 758,
    size: 10.5,
    font: bodyFont,
    color: rgb(0.36, 0.4, 0.46),
  });

  reportPage.drawText(`Ultima atualizacao em ${formatDateTime(input.signedAt)}`, {
    x: 44,
    y: 740,
    size: 10.5,
    font: bodyFont,
    color: rgb(0.36, 0.4, 0.46),
  });

  reportPage.drawLine({
    start: { x: 44, y: 716 },
    end: { x: 550, y: 716 },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.9),
  });

  drawLabelValueLine({
    page: reportPage,
    label: "Status",
    value: "Assinado",
    x: 44,
    y: 688,
    labelFont: headingFont,
    bodyFont,
  });
  drawLabelValueLine({
    page: reportPage,
    label: "Documento",
    value: input.documentTitle,
    x: 44,
    y: 666,
    labelFont: headingFont,
    bodyFont,
  });
  drawLabelValueLine({
    page: reportPage,
    label: "Numero",
    value: input.documentId,
    x: 44,
    y: 644,
    labelFont: headingFont,
    bodyFont,
  });
  drawLabelValueLine({
    page: reportPage,
    label: "Data da criacao",
    value: formatDateTime(input.documentCreatedAt),
    x: 44,
    y: 622,
    labelFont: headingFont,
    bodyFont,
  });

  reportPage.drawText("Hash do documento original (SHA256):", {
    x: 44,
    y: 600,
    size: 10.5,
    font: headingFont,
    color: rgb(0.12, 0.15, 0.22),
  });
  reportPage.drawText(input.originalHash, {
    x: 44,
    y: 582,
    size: 9,
    font: bodyFont,
    color: rgb(0.22, 0.25, 0.31),
  });

  reportPage.drawLine({
    start: { x: 44, y: 564 },
    end: { x: 550, y: 564 },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.9),
  });

  drawLabelValueLine({
    page: reportPage,
    label: "Carimbo de tempo",
    value: formatDateTime(input.signedAt),
    x: 44,
    y: 540,
    labelFont: headingFont,
    bodyFont,
  });

  reportPage.drawLine({
    start: { x: 44, y: 520 },
    end: { x: 550, y: 520 },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.9),
  });

  reportPage.drawText("Assinaturas", {
    x: 44,
    y: 486,
    size: 18,
    font: headingFont,
    color: rgb(0.18, 0.2, 0.24),
  });

  reportPage.drawText("1 de 1 assinaturas", {
    x: 430,
    y: 488,
    size: 10.5,
    font: bodyFont,
    color: rgb(0.36, 0.4, 0.46),
  });

  reportPage.drawRectangle({
    x: 44,
    y: 280,
    width: 506,
    height: 175,
    borderColor: rgb(0.84, 0.86, 0.9),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  reportPage.drawRectangle({
    x: 54,
    y: 426,
    width: 126,
    height: 24,
    color: rgb(0.9, 0.97, 0.92),
  });
  reportPage.drawText("Assinado", {
    x: 60,
    y: 434,
    size: 10,
    font: bodyFont,
    color: rgb(0.17, 0.54, 0.3),
  });

  reportPage.drawText(input.fullName.toUpperCase(), {
    x: 54,
    y: 392,
    size: 15,
    font: headingFont,
    color: rgb(0.18, 0.2, 0.24),
  });

  reportPage.drawText(`Data e hora da assinatura: ${formatDateTime(input.signedAt)}`, {
    x: 54,
    y: 372,
    size: 10,
    font: bodyFont,
    color: rgb(0.3, 0.34, 0.4),
  });
  reportPage.drawText(`Token: ${input.verificationCode}`, {
    x: 54,
    y: 356,
    size: 10,
    font: bodyFont,
    color: rgb(0.3, 0.34, 0.4),
  });

  reportPage.drawRectangle({
    x: 430,
    y: 318,
    width: 106,
    height: 110,
    borderColor: rgb(0.87, 0.88, 0.91),
    borderWidth: 1,
  });
  reportPage.drawText("Assinatura", {
    x: 440,
    y: 408,
    size: 10,
    font: bodyFont,
    color: rgb(0.3, 0.34, 0.4),
  });
  reportPage.drawText(input.fullName, {
    x: 440,
    y: 356,
    size: 22,
    font: signatureFont,
    color: rgb(0.09, 0.26, 0.5),
  });
  reportPage.drawText(input.fullName, {
    x: 440,
    y: 328,
    size: 10,
    font: bodyFont,
    color: rgb(0.3, 0.34, 0.4),
  });

  reportPage.drawLine({
    start: { x: 44, y: 280 },
    end: { x: 550, y: 280 },
    thickness: 1,
    color: rgb(0.84, 0.86, 0.9),
  });

  reportPage.drawText("Pontos de autenticacao:", {
    x: 54,
    y: 250,
    size: 11,
    font: headingFont,
    color: rgb(0.18, 0.2, 0.24),
  });
  reportPage.drawText(`Telefone: ${input.phone}`, {
    x: 54,
    y: 230,
    size: 10,
    font: bodyFont,
    color: rgb(0.3, 0.34, 0.4),
  });
  reportPage.drawText(`CPF: ${formatCpf(input.cpf)}`, {
    x: 54,
    y: 212,
    size: 10,
    font: bodyFont,
    color: rgb(0.3, 0.34, 0.4),
  });
  reportPage.drawText(`IP: ${input.ipAddress || "Nao informado"}`, {
    x: 54,
    y: 194,
    size: 10,
    font: bodyFont,
    color: rgb(0.3, 0.34, 0.4),
  });

  const deviceLabel = input.userAgent || "Nao informado";
  const deviceLines = wrapText(`Dispositivo: ${deviceLabel}`, 82);
  deviceLines.forEach((line, index) => {
    reportPage.drawText(line, {
      x: 54,
      y: 176 - index * 16,
      size: 10,
      font: bodyFont,
      color: rgb(0.3, 0.34, 0.4),
    });
  });

  return Buffer.from(await pdfDoc.save());
}
