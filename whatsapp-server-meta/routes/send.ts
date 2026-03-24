import { Router } from "express";

const router = Router();

router.post("/meta/send", async (req, res) => {
  try {
    const { to, templateName = "hello_world" } = req.body;

    const token = process.env.META_TEMP_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return res.status(500).json({
        error: "META_TEMP_TOKEN ou META_PHONE_NUMBER_ID não configurados",
      });
    }

    if (!to) {
      return res.status(400).json({
        error: "Campo 'to' é obrigatório",
      });
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: "en_US",
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Erro ao enviar pela Meta:", error);
    return res.status(500).json({
      error: error.message || "Erro interno ao enviar mensagem",
    });
  }
});

export default router;