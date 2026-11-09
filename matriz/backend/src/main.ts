import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// Carrega backend/.env, se existir (função nativa do Node.js). Variáveis já
// definidas no ambiente têm prioridade.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: usam-se só as variáveis do ambiente.
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
