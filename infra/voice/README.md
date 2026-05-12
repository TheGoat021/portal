# Axion Voice Test Server

Estrutura sugerida para o servidor de teste do Axion Voice:

- `1 servidor Ubuntu`
- `Asterisk + voice-server` na mesma VM
- `Nginx` na frente da API
- `PM2` para o `voice-server`

## Layout sugerido no servidor

```text
/opt/axion/voice-server
/etc/asterisk/
/etc/nginx/sites-available/axion-voice.conf
/var/log/axion-voice/
/var/spool/asterisk/monitor/
```

## Ordem de montagem

1. Subir Ubuntu e atualizar o sistema.
2. Instalar Node.js, PM2, Nginx e Asterisk.
3. Publicar o `voice-server` em `/opt/axion/voice-server`.
4. Criar `.env` de produção.
5. Copiar configs do Asterisk a partir de `asterisk-config/`.
6. Configurar Nginx.
7. Abrir firewall.
8. Testar `GET /health`.
9. Só depois conectar trunk Vonex/Flux.

## Arquivos desta pasta

- `bootstrap/01-base-system.sh`
- `bootstrap/02-node-pm2.sh`
- `bootstrap/03-asterisk-nginx.sh`
- `nginx/axion-voice.conf.example`
- `firewall/ufw-voice.example.sh`

## Topologia de teste

Fluxo:

`Cliente -> Vonex/Flux -> Asterisk -> voice-server -> Supabase -> Front`

Para teste, manter tudo no mesmo host reduz variáveis.

## Observações

- O `voice-server` fica em `localhost:4001`.
- O Nginx expõe HTTPS público e faz proxy para a API.
- O Asterisk deve conversar com o `voice-server` localmente em `127.0.0.1`.
- As gravações ficam em `/var/spool/asterisk/monitor` e são servidas pela própria API.
