import fetch from "node-fetch";

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function run() {
  const date = getYesterday();

  const url =
    `https://portal.drdetodos.com.br/api/integrations/google-ads/sync?date=${date}`;

  console.log("[GoogleAds Sync] Disparando para a data:", date);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-cron-secret": "ads_sync_2026_portal_x9A!kQp3",
    },
  });

  const json = await res.json();
  console.log("[GoogleAds Sync] Resposta:", json);
}

run().catch(console.error);
