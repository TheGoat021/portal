# Axion Voice Softphone

## Frontend

Adicione estas variaveis no `.env.local` do portal:

```env
NEXT_PUBLIC_AXION_VOICE_WEBRTC_ENABLED=true
NEXT_PUBLIC_AXION_VOICE_SIP_WSS_URL=wss://voice.seudominio.com.br:8089/ws
NEXT_PUBLIC_AXION_VOICE_SIP_DOMAIN=voice.seudominio.com.br
NEXT_PUBLIC_AXION_VOICE_SIP_DISPLAY_NAME=Axion Voice
NEXT_PUBLIC_AXION_VOICE_STUN_SERVERS=stun:stun.l.google.com:19302
NEXT_PUBLIC_AXION_VOICE_SIP_USERNAME_SUFFIX=-webrtc
NEXT_PUBLIC_AXION_VOICE_SIP_PASSWORD_TEMPLATE={extension}@Axion
```

Notas:

- O `username` SIP do navegador vem automaticamente do `extension` provisionado em `voice_agents`.
- Se o endpoint WebRTC do Asterisk usar um sufixo dedicado, configure `NEXT_PUBLIC_AXION_VOICE_SIP_USERNAME_SUFFIX`. Exemplo: `1042` vira `1042-webrtc`.
- A senha pode ser derivada pelo template acima. Exemplo: o ramal `1042` vira `1042@Axion`.
- Para producao multi-ramal, nao configure `NEXT_PUBLIC_AXION_VOICE_SIP_USERNAME` nem `NEXT_PUBLIC_AXION_VOICE_SIP_PASSWORD`.
- Se voce realmente precisar travar um ramal estatico para laboratorio, use tambem `NEXT_PUBLIC_AXION_VOICE_SIP_USE_STATIC_CREDENTIALS=true`.

## Asterisk

Arquivos-base no repositorio:

- [http.conf.example](/c:/Users/Usuario/portal-interno/asterisk-config/http.conf.example)
- [pjsip.conf.example](/c:/Users/Usuario/portal-interno/asterisk-config/pjsip.conf.example)

Pontos obrigatorios:

- `transport-wss` ativo em `pjsip.conf`
- `tlsenable=yes` e `tlsbindaddr=0.0.0.0:8089` em `http.conf`
- certificado valido para o dominio do voice
- `res_pjsip_transport_websocket.so` carregado e em `Running`
- um endpoint/auth/aor WebRTC por login SIP real do navegador

## Provisionamento

1. Criar o ramal na aba `Axion Voice > Ramais`
2. Confirmar se o usuario ganhou um registro em `public.voice_agents`
3. Criar no Asterisk o endpoint correspondente ao login SIP calculado pelo portal
4. Usar a mesma regra de senha do Asterisk no template do frontend

Exemplo:

- usuario do painel: `1042`
- suffix WebRTC no frontend: `-webrtc`
- login SIP final do navegador: `1042-webrtc`
- senha SIP derivada: `1042@Axion`
- endpoint WebRTC no Asterisk: `1042-webrtc`

## Checklist rapido

1. O usuario aparece em `voice_agents`
2. O widget mostra `Ramal XXXX` e `Login SIP XXXX`
3. O navegador pede permissao de microfone
4. O status muda para `Softphone Axion conectado.`
5. O Asterisk mostra o contato WebRTC registrado

Comandos uteis no servidor:

```bash
sudo asterisk -rx "http show status"
sudo asterisk -rx "module show like res_pjsip_transport_websocket.so"
sudo asterisk -rx "pjsip show endpoint 1042-webrtc"
sudo asterisk -rx "pjsip show contacts"
```
