# syntax=docker/dockerfile:1
# Imagem do backend da Matriz (NestJS + Prisma). Fases:
#   deps    — dependências completas (npm ci, a partir do package-lock.json)
#   build   — cliente Prisma (src/generated) e compilação para dist/
#   tools   — CLI do Prisma e tsx: migrations e seed (serviço "migrate" do compose.yaml)
#   runtime — só dist/ e as dependências de produção; é a imagem da API
# Não há credenciais nesta imagem: DATABASE_URL, JWT_SECRET e as outras
# variáveis chegam pelo ambiente do container (compose.yaml / .env).

# Mesma versão do .nvmrc.
ARG NODE_IMAGE=node:26.13.0-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
# O prisma.config.ts lê DATABASE_URL, mas o `prisma generate` não liga à base
# de dados: este endereço só satisfaz a configuração e não é uma credencial.
RUN DATABASE_URL="postgresql://build@localhost:5432/build" npx prisma generate \
 && npm run build

FROM build AS tools
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false
USER node
# Por omissão aplica as migrations; o seed corre a pedido (npm run db:seed).
CMD ["npx", "prisma", "migrate", "deploy"]

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node", "dist/main.js"]
