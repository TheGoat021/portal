# Axion Sign API

## Visao geral

API externa para envio de contratos PDF, geracao de link de assinatura e consulta de status.

Base local:

```text
{NEXT_PUBLIC_APP_URL}/api/signatures/v1
```

Exemplo:

```text
https://portal.seudominio.com.br/api/signatures/v1
```

## Autenticacao

Todos os endpoints da API externa exigem o header:

```http
x-api-key: SUA_CHAVE
```

Configure as chaves no ambiente:

```env
SIGNATURE_API_KEYS=erp01:chave-super-segura,crm02:outra-chave-super-segura
```

Formato:

- `cliente_id:api_key`
- multiplos clientes separados por virgula

## Resposta padrao

Sucesso:

```json
{
  "ok": true,
  "data": {}
}
```

Erro:

```json
{
  "ok": false,
  "error": {
    "code": "not_found",
    "message": "Contrato nao encontrado."
  }
}
```

## Endpoints

### `POST /contracts`

Cria um contrato para assinatura.

Aceita:

- `multipart/form-data`
- `application/json`

Campos:

- `title`: nome do contrato
- `externalReference`: referencia externa do sistema integrador
- `publish`: opcional, default `true`
- `webhookUrl`: opcional
- `webhookSecret`: opcional

Observacao:

- para uso via API externa, mantenha `publish=true`
- se `publish=false`, o contrato fica em rascunho e a `v1` nao expoe um endpoint publico para publicar depois

### Exemplo multipart

```bash
curl -X POST "https://portal.seudominio.com.br/api/signatures/v1/contracts" \
  -H "x-api-key: chave-super-segura" \
  -F "title=Contrato 1181827" \
  -F "externalReference=1181827" \
  -F "publish=true" \
  -F "webhookUrl=https://erp.exemplo.com/webhooks/axion-sign" \
  -F "webhookSecret=minha-chave-hmac" \
  -F "file=@contrato.pdf;type=application/pdf"
```

### Exemplo JSON

```json
{
  "title": "Contrato 1181827",
  "externalReference": "1181827",
  "publish": true,
  "webhookUrl": "https://erp.exemplo.com/webhooks/axion-sign",
  "webhookSecret": "minha-chave-hmac",
  "fileName": "contrato.pdf",
  "mimeType": "application/pdf",
  "fileBase64": "JVBERi0xLjcKJc..."
}
```

### Resposta

```json
{
  "ok": true,
  "data": {
    "id": "4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e",
    "title": "Contrato 1181827",
    "status": "pending_signature",
    "externalReference": "1181827",
    "integrationSource": "erp01",
    "webhookUrl": "https://erp.exemplo.com/webhooks/axion-sign",
    "createdAt": "2026-06-10T18:01:22.000Z",
    "publishedAt": "2026-06-10T18:01:23.000Z",
    "signingUrl": "https://portal.seudominio.com.br/assinatura/abc123token",
    "endpoints": {
      "self": "https://portal.seudominio.com.br/api/signatures/v1/contracts/4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e",
      "link": "https://portal.seudominio.com.br/api/signatures/v1/contracts/4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e/link",
      "status": "https://portal.seudominio.com.br/api/signatures/v1/contracts/4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e/status"
    }
  }
}
```

### `GET /contracts/:id`

Retorna detalhes completos do contrato.

Exemplo:

```bash
curl "https://portal.seudominio.com.br/api/signatures/v1/contracts/4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e" \
  -H "x-api-key: chave-super-segura"
```

Resposta:

```json
{
  "ok": true,
  "data": {
    "id": "4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e",
    "title": "Contrato 1181827",
    "status": "signed",
    "externalReference": "1181827",
    "integrationSource": "erp01",
    "webhookUrl": "https://erp.exemplo.com/webhooks/axion-sign",
    "createdAt": "2026-06-10T18:01:22.000Z",
    "publishedAt": "2026-06-10T18:01:23.000Z",
    "signedAt": "2026-06-10T18:12:41.000Z",
    "signer": {
      "fullName": "Nicolas Vitor da Silva",
      "phone": "5511999999999",
      "cpf": "00000000000"
    },
    "files": {
      "originalUrl": "https://...",
      "signedUrl": "https://..."
    },
    "endpoints": {
      "link": "https://portal.seudominio.com.br/api/signatures/v1/contracts/4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e/link",
      "status": "https://portal.seudominio.com.br/api/signatures/v1/contracts/4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e/status"
    }
  }
}
```

### `GET /contracts/:id/link`

Retorna o link publico de assinatura.

Se o contrato ainda estiver em rascunho, `signingUrl` pode retornar `null`.

Resposta:

```json
{
  "ok": true,
  "data": {
    "id": "4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e",
    "status": "pending_signature",
    "publicToken": "abc123token",
    "signingUrl": "https://portal.seudominio.com.br/assinatura/abc123token"
  }
}
```

### `GET /contracts/:id/status`

Retorna o status atual da assinatura.

Resposta:

```json
{
  "ok": true,
  "data": {
    "id": "4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e",
    "title": "Contrato 1181827",
    "status": "signed",
    "signedAt": "2026-06-10T18:12:41.000Z",
    "signerName": "Nicolas Vitor da Silva",
    "signerCpf": "00000000000",
    "signedFileUrl": "https://...",
    "webhookUrl": "https://erp.exemplo.com/webhooks/axion-sign"
  }
}
```

## Webhook

Se `webhookUrl` for informado na criacao do contrato, o Axion envia um callback quando a assinatura for concluida.

Evento:

```json
{
  "event": "signature.completed",
  "document": {
    "id": "4f8bcb1d-c7cb-42cc-80b7-f0e6394ec93e",
    "title": "Contrato 1181827",
    "status": "signed",
    "externalReference": "1181827",
    "integrationSource": "erp01",
    "createdAt": "2026-06-10T18:01:22.000Z",
    "publishedAt": "2026-06-10T18:01:23.000Z",
    "signedAt": "2026-06-10T18:12:41.000Z",
    "signingUrl": "https://portal.seudominio.com.br/assinatura/abc123token",
    "originalFileUrl": "https://...",
    "signedFileUrl": "https://..."
  },
  "signer": {
    "fullName": "Nicolas Vitor da Silva",
    "phone": "5511999999999",
    "cpf": "00000000000"
  },
  "audit": {
    "verificationCode": "31add42f-3d0-40db-92bb-e61ce5444c0b",
    "originalHash": "7fd141a6fb4ae1ad7e0d638152090e85dc94d09b79194826a85646b0c9b32ce0",
    "signedAt": "2026-06-10T18:12:41.000Z"
  }
}
```

### Assinatura HMAC do webhook

Se `webhookSecret` for informado, o webhook sai com o header:

```http
x-signature: <sha256_hmac_do_json>
```

O hash e calculado sobre o corpo bruto do JSON.

## Fluxo sugerido de integracao

1. Sistema parceiro envia o PDF para `POST /contracts`
2. Recebe `id` e `signingUrl`
3. Armazena o `id` localmente
4. Consulta `GET /contracts/:id/status` quando precisar
5. Opcionalmente recebe o `webhook` quando a assinatura finalizar

## SQL adicional para webhook

Se o banco ainda nao tiver esses campos em `signature_documents`, rode:

```sql
alter table public.signature_documents
  add column if not exists webhook_url text,
  add column if not exists webhook_secret text;
```
