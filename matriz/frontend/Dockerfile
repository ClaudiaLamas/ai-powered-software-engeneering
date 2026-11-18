# syntax=docker/dockerfile:1
# Imagem do frontend da Matriz. Fases:
#   build   — verificação de tipos (vue-tsc) e compilação para dist/ (Vite)
#   runtime — nginx sem privilégios: serve dist/ e encaminha /api para o backend
# Não há credenciais nem variáveis VITE_ nesta imagem: o frontend chama /api
# no mesmo endereço e o nginx encaminha esses pedidos (nginx.conf).

# Mesma versão do .nvmrc.
ARG NODE_IMAGE=node:26.13.0-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${NGINX_IMAGE} AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
