# Imagem do Beatus OS (site, sistema e Beatriz: o mesmo aplicativo Next.js).
# Para subir o servidor use deploy/docker-compose.yml (veja docs/HOSPEDAGEM.md).
# Nenhum segredo entra na imagem: o .env fica fora (veja .dockerignore) e chega só na hora de rodar.

FROM node:24-bookworm-slim AS base

# O relógio do servidor é o de Manaus (o estado da operação usa o relógio do servidor).
ENV TZ=America/Manaus \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl tzdata \
    && rm -rf /var/lib/apt/lists/*

# ---------- Dependências ----------
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

# ---------- Compilação ----------
FROM deps AS build

COPY . .

# O Prisma só lê o schema para gerar o cliente: não conecta a nenhum banco. A URL abaixo é de mentira
# e existe só porque o prisma.config.ts a lê; a de verdade chega em tempo de execução.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# (As dependências de desenvolvimento ficam na imagem de propósito: o Next pode precisar do TypeScript
# para ler o next.config.ts ao iniciar. Imagem maior, mas sem surpresa.)
RUN npx prisma generate \
    && npm run build

# ---------- Execução ----------
FROM base AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    BEATUS_STORAGE_PATH=/dados/storage

COPY --from=build --chown=node:node /app /app

# Arquivos enviados pelo sistema (documentos das compras): ficam num volume, fora da imagem.
RUN mkdir -p /dados/storage && chown -R node:node /dados

USER node

EXPOSE 3000

CMD ["npm", "start"]
