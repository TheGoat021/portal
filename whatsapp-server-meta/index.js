import express from "express";

const app = express();
const PORT = 4001;
const VERIFY_TOKEN = "axion_verify_token";

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("Meta server online");
});


app.get("/webhook/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook/meta", (req, res) => {
  console.log("📩 POST recebido em /webhook/meta");
  console.dir(req.body, { depth: null });
  return res.sendStatus(200);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Meta server rodando na porta ${PORT}`);
});