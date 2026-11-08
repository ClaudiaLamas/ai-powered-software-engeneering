# Matriz — frontend

Interface web da Matriz em Vue 3, Vite e TypeScript, com Vue Router
(ver [docs/architecture.md](../docs/architecture.md) e o wireframe em
[docs/ui/dashboard-wireframe.html](../docs/ui/dashboard-wireframe.html)).

## Requisitos

- Node.js na versão indicada em [`.nvmrc`](../.nvmrc) (`nvm use` na raiz do repositório).
- O backend a correr, no endereço indicado em `VITE_API_URL`.

## Preparar

```bash
cp .env.example .env    # ajusta o endereço da API, se for preciso
npm install
```

As variáveis `VITE_` ficam visíveis no navegador: não ponhas segredos no `.env`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Arranca o servidor de desenvolvimento do Vite |
| `npm run build` | Verifica os tipos (`vue-tsc`) e compila para `dist/` |
| `npm run preview` | Serve localmente o resultado do `build` |
| `npm run test:unit` | Testes de componentes e vistas (Vitest), em modo de observação |
| `npx vitest run` | Os mesmos testes, uma só vez |
