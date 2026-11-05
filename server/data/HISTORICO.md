# Ampliação histórica das fichas (anos 2000 até hoje)

Objetivo: cobrir as gerações dos carros vendidos no Brasil desde 2000, não só a linha atual.

## Regras

1. Formato: o mesmo de `FORMATO.md`. Edite o arquivo da marca em `fichas/<marca>.json`.
2. **Não altere nem apague** o que já existe; só acrescente.
   - Modelo que já existe → acrescente gerações novas dentro dele.
   - Geração que já existe → reutilize o **mesmo nome exato** e acrescente versões nela.
   - Modelo fora de linha que não existe → crie o modelo (com a categoria correta).
3. Por geração, cadastre as versões principais (cada combinação diferente de motor/câmbio) em
   **dois momentos**: o ano-modelo de lançamento e o ano da reestilização ou o último ano, quando a
   ficha mudou (motor novo, potência nova, câmbio novo). Não repita anos sem mudança.
4. Nomes de geração no padrão `"<n>ª geração (<código>)"`, ou `"G5"`, `"Fase 2"` quando for o nome
   usado no Brasil. `ano_fim` = último ano-modelo vendido (ou null se segue em produção).
5. **Só com boa confiança.** Valor de que não tem certeza → `null`. Não estime 0–100 ou consumo
   "de cabeça". Motores flex antigos: potência e torque com gasolina e com etanol separados.
   Consumo Inmetro só existe a partir de ~2009; antes disso, deixe `null`.
6. Versões para o mercado brasileiro (motor, potência e nome de versão daqui, não da Europa/EUA).
7. Valide sempre: `node server/scripts/validar.js server/data/fichas/<marca>.json`.
