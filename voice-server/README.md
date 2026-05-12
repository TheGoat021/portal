# Axion Voice

Camada inicial de PABX/contact center do Axion, usando Asterisk no MVP e mantendo Vonex/Flux como provedores SIP Trunk.

## Instalação

```bash
cd voice-server
npm install
cp .env.example .env
```

## Configuração do `.env`

Preencha:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASTERISK_ARI_*`
- `ASTERISK_AMI_*`
- `RECORDINGS_DIR`
- `RECORDINGS_PUBLIC_BASE_URL`

Opcionais:

- `VOICE_DEFAULT_ORIGEM_ID`
- `NEXT_PUBLIC_AXION_VOICE_API_URL`

## Banco no Supabase

Execute a migration `supabase/migrations/20260505_axion_voice.sql`.

## Rodando localmente

```bash
cd voice-server
npm run dev
```

## PM2

```bash
cd voice-server
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

## Estrutura recomendada de teste

Para um servidor unico de teste com Asterisk + API:

- publique o projeto em `/opt/axion/voice-server`
- use `.env.production.example` como base do `.env`
- use os arquivos em `infra/voice/` para bootstrap do host, Nginx e firewall

Arquivos operacionais:

- `voice-server/ecosystem.config.cjs`
- `voice-server/.env.production.example`
- `infra/voice/bootstrap/*.sh`
- `infra/voice/nginx/axion-voice.conf.example`
- `infra/voice/firewall/ufw-voice.example.sh`

## Fluxo do MVP

1. Cliente liga para o número da Vonex/Flux.
2. O SIP Trunk entrega no Asterisk.
3. O dialplan toca áudio inicial.
4. A chamada entra em `Queue(comercial)` ou em `Stasis(axion-voice)`.
5. O `voice-server` recebe eventos via AMI, ARI REST e `/webhooks/asterisk/event`.
6. O serviço normaliza o telefone, tenta vincular `clientes/leads`, grava eventos e expõe tudo ao painel.

## Como configurar o Asterisk

Use os exemplos em `asterisk-config/`:

- `pjsip.conf.example`
- `extensions.conf.example`
- `queues.conf.example`
- `manager.conf.example`
- `ari.conf.example`

Substitua:

- `SIP_TRUNK_HOST`
- `SIP_TRUNK_USERNAME`
- `SIP_TRUNK_PASSWORD`
- `AXION_VOICE_SERVER_URL`
- `ASTERISK_ARI_USER`
- `ASTERISK_ARI_PASSWORD`
- `ASTERISK_AMI_USER`
- `ASTERISK_AMI_PASSWORD`

## Teste de chamada inbound

```bash
asterisk -rx "pjsip show registrations"
asterisk -rx "pjsip show endpoints"
asterisk -rvvv
```

Faça uma ligação real para o número da Vonex/Flux e confira:

- `GET /health`
- `GET /calls/active`
- `GET /queues`

## Teste de eventos sem trunk

```bash
curl -X POST http://127.0.0.1:4001/webhooks/asterisk/event ^
  -H "Content-Type: application/json" ^
  -d "{\"eventType\":\"call.inbound\",\"payload\":{\"channelId\":\"test-channel-1\",\"uniqueId\":\"1715000000.1\",\"callerNumber\":\"11999998888\",\"queueId\":\"comercial\"}}"
```

Depois:

```bash
curl http://127.0.0.1:4001/calls/active
```

## Como validar a entrega SIP de Vonex/Flux

- Ligue `pjsip set logger on` no console do Asterisk.
- Procure `INVITE` chegando no IP do servidor.
- Valide firewall, NAT, `identify`, autenticação e roteamento no provedor.

## Fase 1 vs Fase 2

### Fase 1

- Asterisk + SIP Trunk + filas
- agentes atendendo por softphone externo ou telefone IP
- painel do Axion controlando status, histórico, CRM e gravações

### Fase 2

- WebRTC com `transport-wss`, TLS e SRTP
- SIP.js ou JsSIP no front
- atendimento direto no navegador

## Observações

- O front não recebe `service role`.
- O módulo de voz não reutiliza tabelas do WhatsApp.
- `transcription` e `summary` em `voice_calls` já deixam a base pronta para IA futura.
