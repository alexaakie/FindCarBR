// Carrega o .env (se existir) antes de qualquer outro módulo do servidor.
// Feito em código, e não com --env-file, porque o modo --watch do Node
// quebra quando o arquivo .env não existe.
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com as variáveis do ambiente
}
