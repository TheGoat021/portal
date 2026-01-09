import { useEffect, useState } from "react";

export type Colaborador = {
  nome: string;
  meta: number;
  atual: number;
};

const SHEET_ID = "1uRsE6eITJleW_G92_FdWaln2_sTqpz4R7z47RHEAlx4";
const SHEET_NAME = "Página1";

export function useMetas() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
            SHEET_NAME
          )}&tqx=out:json`
        );

        const text = await res.text();
        const json = JSON.parse(text.replace(/^[^(]*\(|\);?$/g, ""));
        const headers = json.table.cols.map((c: any) => c.label);

        const data = json.table.rows.map((r: any) => {
          const obj: any = {};
          r.c.forEach((cell: any, i: number) => {
            obj[headers[i]] = cell?.v ?? "";
          });

          return {
            nome: obj["Nome"],
            meta: Number(obj["Meta"]),
            atual: Number(obj["Atual"]),
          };
        });

        setColaboradores(data);
      } catch (e) {
        console.error("Erro ao carregar metas", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const ordenados = [...colaboradores].sort(
    (a, b) => b.atual - a.atual
  );

  const somaMeta = colaboradores.reduce((a, c) => a + c.meta, 0);
  const somaAtual = colaboradores.reduce((a, c) => a + c.atual, 0);
  const progressoGeral = somaMeta
    ? (somaAtual / somaMeta) * 100
    : 0;

  return {
    loading,
    colaboradores: ordenados,
    somaMeta,
    somaAtual,
    progressoGeral,
  };
}
