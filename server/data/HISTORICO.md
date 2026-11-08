# Ampliação histórica das fichas (anos 2000 até hoje)

Objetivo: cobrir as gerações dos carros vendidos no Brasil desde 2000, não só a linha atual.

## Regras

1. Formato: o mesmo de `FORMATO.md`. Edite o arquivo da marca em `fichas/<marca>.json`.
2. **Não altere nem apague** o que já existe; só acrescente.
   - Modelo que já existe → acrescente gerações novas dentro dele.
   - Geração que já existe → reutilize o **mesmo nome exato** e acrescente versões nela.
   - Modelo fora de linha que não existe → crie o modelo (com a categoria correta).
3. Use o formato de faixa (ver `FORMATO.md`): cada versão com `"anos": [primeiro, último]` cobrindo os
   anos-modelo em que foi vendida, e o que mudou (motor, potência, câmbio, pneus…) em `"mudancas"`, no
   ano em que mudou. Só declare a faixa inteira se tiver confiança em todos os anos; se souber de um
   ano só, use `"ano_modelo"`. As fichas antigas cadastradas por amostragem (lançamento e
   reestilização) continuam válidas e podem ser convertidas aos poucos.
4. Nomes de geração no padrão `"<n>ª geração (<código>)"`, ou `"G5"`, `"Fase 2"` quando for o nome
   usado no Brasil. `ano_fim` = último ano-modelo vendido (ou null se segue em produção).
5. **Só com boa confiança.** Valor de que não tem certeza → `null`. Não estime 0–100 ou consumo
   "de cabeça". Motores flex antigos: potência e torque com gasolina e com etanol separados.
   Consumo Inmetro só existe a partir de ~2009; antes disso, deixe `null`.
6. Versões para o mercado brasileiro (motor, potência e nome de versão daqui, não da Europa/EUA).
7. Valide sempre: `node server/scripts/validar.js server/data/fichas/<marca>.json`.
