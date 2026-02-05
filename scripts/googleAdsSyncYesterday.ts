import fetch from "node-fetch";

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function run() {
  const date = getYesterday();

  const url =
    `http://localhost:3000/api/integrations/google-ads/sync` +
    `?date=${date}` +
    `&secret=ads_sync_2026_portal_x9A!kQp3`;

  console.log("[GoogleAds Sync] Disparando para a data:", date);

  const res = await fetch(url, {
    method: "POST",
  });

  const json = await res.json();

  console.log("[GoogleAds Sync] Resposta:", json);
}

run().catch(console.error);
