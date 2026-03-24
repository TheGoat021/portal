import { Router } from "express";

const router = Router();

const VERIFY_TOKEN = "axion_verify_token";

router.get("/webhook/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Meta verificado");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.post("/webhook/meta", (req, res) => {
  console.log("📩 Evento recebido da Meta:");
  console.dir(req.body, { depth: null });

  return res.sendStatus(200);
});

export default router;