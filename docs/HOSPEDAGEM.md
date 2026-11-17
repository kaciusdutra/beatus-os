# Hospedagem do Beatus (VPS)

Este guia coloca o Beatus inteiro (site, sistema, Beatriz e banco de dados) num **VPS**. Foi escrito para a Hostinger, mas serve para qualquer VPS com Linux.

> **Estado (17/11/2026):** os arquivos de implantação estão prontos (pasta `deploy/` e `frontend/Dockerfile`), mas **nunca rodaram num servidor**. O que foi conferido: o `docker-compose.yml` é válido, os scripts não têm erro de sintaxe, o sistema compila **sem banco** (`next build`) e sobe em modo de produção, e o teste de saúde do contêiner responde 503 quando o banco cai. O que **não** foi conferido, porque o computador de desenvolvimento não tem o WSL e o Docker não roda nele: a **construção da imagem Docker**, o HTTPS do Caddy e os scripts de backup e restauração. Siga o roteiro e anote o que não bater: o primeiro uso é também o teste (faça um snapshot do VPS antes e use o `sandbox` do pagamento).

## O que sobe no servidor

Quatro peças, todas em Docker, definidas em `deploy/docker-compose.yml`:

| Peça | O que faz | Aberta para a internet? |
|---|---|---|
| `proxy` (Caddy) | Porta de entrada: HTTPS automático (Let's Encrypt) | **Sim** (portas 80 e 443) |
| `app` | O Beatus OS: site `/cardapio`, sistema, Beatriz, webhooks | Não (só pelo proxy) |
| `banco` | PostgreSQL 17 com todos os dados | **Não** |
| `migrar` | Aplica as migrações do banco e termina; se falhar, o `app` novo não sobe | Não |

Dados que **não podem se perder** ficam em volumes do Docker: o banco (`beatus_pgdata`) e os arquivos enviados (`beatus_storage`). O backup (abaixo) cobre os dois.

## O que é com você

- Contratar o **VPS** e o **domínio** (e apontar o DNS).
- Os **segredos**: chaves do Mercado Pago, da IA, da Meta. Eles ficam só no arquivo `.env` do servidor; **não os cole em chat, e-mail nem no GitHub**.
- O **CNPJ regular** e a **política de privacidade** preenchida e revisada (`docs/BEATRIZ_IA.md` traz a lista do que falta antes de abrir ao público).
- Decidir **onde guardar o backup fora do servidor**.

## 1. Contratar o VPS

- Plano: um **KVM 2** (2 vCPU, 8 GB) é um bom ponto de partida para um app pequeno em produção; dá para subir de plano depois. Confirme preços e recursos na página da Hostinger.
- Sistema: **Ubuntu 24.04**. Se houver o modelo "Ubuntu com Docker", escolha-o (pula o passo de instalar o Docker).
- Região: escolha a **mais próxima de Manaus** que houver (menos atraso) e confira onde os dados ficam (LGPD).
- Ative os **backups do próprio VPS** (snapshots) como segunda camada, mas **não conte só com eles**: o backup diário do banco (passo 8) é o que vale.

## 2. Preparar o servidor (uma vez)

Entre no servidor pelo terminal do painel da Hostinger ou por SSH (`ssh root@IP-DO-SERVIDOR`) e rode:

```bash
# atualizar o sistema
apt update && apt -y upgrade

# criar um usuário comum (não trabalhe como root) e dar acesso de administrador
adduser beatus
usermod -aG sudo beatus

# firewall: só SSH, HTTP e HTTPS
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

**Acesso por chave (recomendado):** no seu computador gere uma chave (`ssh-keygen -t ed25519`), copie a chave **pública** para o servidor (`ssh-copy-id beatus@IP-DO-SERVIDOR`), confirme que entra sem senha e só então desligue a senha em `/etc/ssh/sshd_config` (`PasswordAuthentication no` e `PermitRootLogin no`, depois `systemctl restart ssh`). Nunca compartilhe a chave **privada**.

**Docker** (se o modelo do VPS não veio com ele):

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker beatus
```

Saia e entre de novo como `beatus` para o grupo valer.

## 3. Domínio (DNS)

No painel do domínio, crie um registro **A** apontando `beatus.seudominio.com.br` (o endereço que você escolher) para o **IP do VPS**. O HTTPS só funciona depois que o DNS propagou (minutos a algumas horas). Quer `www` também? Crie o registro e descomente o trecho no `deploy/Caddyfile`.

## 4. Baixar o projeto

Como usuário `beatus`:

```bash
git clone https://github.com/kaciusdutra/beatus-os.git
cd beatus-os/deploy
```

## 5. Configurar

```bash
cp .env.example .env
nano .env        # preencha DOMINIO e POSTGRES_PASSWORD (gere com: openssl rand -hex 24)
chmod 600 .env   # só você lê
```

Os demais campos (Mercado Pago, IA, WhatsApp) podem ficar vazios no começo: o que não está configurado simplesmente não aparece ou não é enviado, e nada quebra. Para ligar cada um, siga `docs/CHECKOUT_MERCADO_PAGO.md`, `docs/BEATRIZ_IA.md` e `docs/WHATSAPP_AVISOS.md`, e depois rode `docker compose up -d` (recria só o que mudou).

## 6. Subir

```bash
docker compose up -d --build     # a primeira vez demora alguns minutos (compila a imagem)
docker compose ps                # todos "running"; o migrar fica "exited (0)", e isso é o certo
docker compose logs --tail 50 app
```

**Cadastrar a empresa** (só nesta primeira vez, num banco novo; sem isso nenhuma tela funciona):

```bash
docker compose exec -T banco psql -U beatus -d beatus < criar-empresa.sql
```

**Primeiro acesso:** abra `https://SEU-DOMINIO/login` e crie o administrador (a opção de primeiro acesso só funciona enquanto não existe nenhum usuário). Escolha uma senha forte e **não use** as senhas dos usuários de teste.

## 7. Avisos de pagamento e WhatsApp (webhooks)

- Mercado Pago: cadastre `https://SEU-DOMINIO/api/publico/mercadopago/webhook` no painel do Mercado Pago e use a chave secreta no `.env` (passo a passo em `docs/CHECKOUT_MERCADO_PAGO.md`).
- WhatsApp: quando a Meta estiver pronta, o endereço público do servidor é o que ela vai chamar (fase 3b, ainda não construída).

## 8. Backup (não pule)

O banco tem os pedidos e os clientes. Faça backup **todo dia** e **guarde fora do servidor**.

```bash
# teste uma vez à mão
./backup.sh        # cria banco-AAAAMMDD-HHMMSS.dump e arquivos-AAAAMMDD-HHMMSS.tar.gz em /var/backups/beatus

# automatizar: todo dia às 03:30
sudo mkdir -p /var/backups/beatus && sudo chown beatus /var/backups/beatus
crontab -e         # acrescente a linha:
# 30 3 * * * cd /home/beatus/beatus-os/deploy && ./backup.sh >> /home/beatus/backup.log 2>&1
```

- O script guarda 14 dias no próprio servidor e confere que o dump abre.
- **Fora do servidor:** instale o `rclone`, configure uma nuvem (Google Drive, Backblaze, etc.) e defina `RCLONE_REMOTE=nome:pasta` no ambiente do cron: o script copia os arquivos novos para lá. Um backup só no servidor some junto com ele.
- **Teste a restauração** pelo menos uma vez (`./restaurar.sh caminho/do/banco-....dump`) antes de depender dela. Ela faz uma cópia do banco atual antes de substituir.

## 9. Atualizar o sistema

Quando houver versão nova no GitHub:

```bash
cd ~/beatus-os/deploy
./atualizar.sh     # backup -> baixa o código -> compila -> migra o banco -> sobe
```

## 10. No dia a dia

```bash
docker compose ps                    # o que está no ar
docker compose logs -f app           # acompanhar o aplicativo
docker compose restart app           # reiniciar o aplicativo
docker compose down                  # parar tudo (os dados ficam nos volumes)
```

Coloque o endereço do site num monitor gratuito (por exemplo UptimeRobot) para ser avisado se cair.

## Dados: começar do zero ou levar o que já existe

- **Do zero (recomendado):** o banco novo nasce vazio, só com a empresa. Cadastre produtos, preços, fichas, insumos e usuários reais pelas telas. Evita levar dado de teste.
- **Levando o banco de hoje:** é possível (`pg_dump` do banco de desenvolvimento e `./restaurar.sh` no servidor), mas ele traz pedidos, clientes e usuários **de teste**, e o backlog manda limpá-los antes de produção (inclui o fornecedor de CNPJ 11.222.333/0001-81). Faça isso só com a limpeza decidida e autorizada.

## Beatriz e as próximas IAs

- A Beatriz é parte do aplicativo: sobe junto, sem servidor próprio. A chave da IA fica no `.env` (`docs/BEATRIZ_IA.md`).
- As próximas IAs do Beatus entram como módulos do mesmo aplicativo. Se alguma ficar pesada, ela vira um serviço a mais no mesmo `docker-compose.yml`, no mesmo VPS.
- **Custo:** defina **limite de gasto** no console da IA. O teto diário do chat (`BEATRIZ_TETO_DIARIO_SITE`) fica na memória do aplicativo e zera quando ele reinicia.

## Conectar uma IA ao servidor (terminal, MCP, SSH)

Existem formas de deixar uma IA mexer no VPS: o assistente do terminal do painel da Hostinger (Kodee), o servidor MCP oficial da Hostinger (precisa de um **token de API da conta**) e uma conexão SSH. Cuidados, porque o servidor guarda os dados dos clientes:

- Prefira **um usuário comum com chave SSH** (nunca o root nem a senha). Dê o mínimo de poder necessário.
- Um token de API da Hostinger costuma valer para a **conta inteira** (servidores, domínios, DNS). Confirme o alcance antes de gerar e apague o token quando não precisar mais.
- Faça um **snapshot** do VPS antes de cada sessão de manutenção e leia o que a IA vai rodar antes de aprovar.
- **Nunca** cole senhas, chaves privadas, tokens ou o `.env` na conversa.

## Limitações conhecidas

- **Um servidor só:** o limite por visitante e o teto da Beatriz ficam na memória (valem para um servidor).
- **Agendador:** o próprio aplicativo entrega os avisos do WhatsApp (a cada 15 s) e consulta os marketplaces (a cada 30 s) sem tela aberta. Ele sobe junto com o sistema; `BEATUS_AGENDADOR=desligado` no `.env` o desliga (por exemplo, numa segunda cópia). Só o teto diário da Beatriz continua na memória do aplicativo.
- **Fotos de produtos** (backlog) vão usar o volume `storage`, que já entra no backup.
- Atualizar derruba o site por alguns segundos (troca do contêiner).

## Checklist antes de abrir ao público

- [ ] DNS apontando e HTTPS funcionando (cadeado no navegador).
- [ ] Empresa cadastrada e administrador criado (senha forte); usuários de teste não existem.
- [ ] Backup diário rodando, cópia **fora** do servidor e restauração testada.
- [ ] Firewall ligado (só 22, 80, 443) e acesso por chave.
- [ ] Mercado Pago em `producao` com o webhook cadastrado (só depois do teste em `sandbox`).
- [ ] Chave da IA com limite de gasto; política de privacidade revisada e preenchida.
- [ ] Preços do canal Site definidos e casa com horário configurado.
