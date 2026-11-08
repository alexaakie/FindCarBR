# Decisões do projeto

Registro das decisões de arquitetura e de regras de negócio. Cada item diz o que foi decidido,
por quê e o que isso implica para quem for implementar. Decisão nova → item novo no fim.

## 1. Fonte de verdade: JSON no Git (nov/2026)

**Decisão.** Os dados curados (fichas técnicas, fontes, fotos) vivem nos JSON em `server/data/` e
são versionados no Git. O banco SQLite é só um reflexo gerado a partir deles.

**Por quê.** Histórico de commits, revisão por Pull Request, nada de autenticação pesada no site por
enquanto, e todo ambiente local sobe igual com `npm run db:popular`.

**Implicações.**
- `npm run db:popular` deixa o banco exatamente igual aos JSON: remove versões que saíram dos
  arquivos, e status de verificação e código FIPE manual sempre seguem o JSON.
- Se qualquer arquivo tiver erro, a carga não grava nada.
- Exceção: dados de referência externos, importados por script e reproduzíveis a partir da fonte
  oficial (Tabela FIPE e o vínculo automático com ela; no futuro, recalls), ficam só no banco.
- A curadoria pelo site (fase de verificação) não grava no banco: gera um diff/patch dos JSON e abre
  um Pull Request, ou salva o JSON na branch de trabalho para commit.

## 2. Migrações numeradas do schema (nov/2026)

**Decisão.** O schema fica em `server/migracoes.js`, uma lista ordenada de migrações. O banco guarda
as aplicadas na tabela `schema_versao`. `abrirBanco()` aplica as pendentes; `npm run db:migrar -- --status`
mostra a situação.

**Regras.** Nunca editar nem reordenar uma migração publicada; mudança nova = migração nova no fim.
Cada migração roda numa transação com chaves estrangeiras conferidas no final. Valores de enum são
validados em `server/fichas.js`, não com `CHECK` no SQLite, para que um valor novo não exija
reconstruir a tabela. (Exceção herdada: `versoes.status_dados` tem `CHECK`; a fase de verificação,
que cria estados novos, precisará de uma migração que reconstrói essa tabela.)

## 3. Ano-modelo: faixas no JSON, uma linha por ano no banco (nov/2026)

**Decisão.** No JSON, uma versão pode declarar `"anos": [primeiro, último]` e as diferenças de cada
ano em `"mudancas"`. A carga expande isso em uma ficha por ano-modelo. O formato antigo
(`"ano_modelo"`) continua válido.

**Por quê.** Endereços de página, vínculo com a FIPE e comparador já são por ano; sem a faixa, a mesma
ficha teria de ser digitada a cada ano. Detalhes em `server/data/FORMATO.md`.

## 4. Fontes por seção da ficha (nov/2026)

**Decisão.** As fontes ficam num registro único (`server/data/fontes.json`) e cada versão diz quais
fontes valem para cada seção (motor, consumo, dimensões…). No banco: tabelas `fontes` e `ficha_fontes`.

**Por quê.** É a base do selo "verificado": verificar exige saber de onde veio cada número, e as fontes
costumam ser diferentes por seção (consumo do Inmetro, motor do fabricante).

## 5. Contagem de airbags (nov/2026) — para a fase de segurança

- Conta-se cada **bolsa física independente**: cada ponto de expansão isolado = 1.
- Exemplo: 2 frontais + 2 laterais nos bancos + 2 de cortina = 6.
- Airbag de joelho conta como unidade separada (ex.: +1 para o motorista).
- A ficha mostra o total e o detalhamento por tipo (frontal, lateral, cortina, joelho, central, traseiro).

## 6. Equipamentos: série, opcional, ausente, não cadastrado (nov/2026) — para a fase de equipamentos

Tabela `versao_equipamentos (versao_id, equipamento_id, situacao, observacao_pacote)`:

| `situacao` | Significado | No JSON |
|---|---|---|
| `1` | Série: vem de fábrica na versão | `"serie"` |
| `0` | Opcional: disponível com pacote ou pagamento | `"opcional"` |
| `-1` | Ausente: não existe nem como opcional | `"ausente"` |
| sem registro | Não cadastrado: a interface mostra "dado não mapeado", nunca "não tem" | (item omitido) |

- Pacotes: a base guarda só o item ligado à versão como opcional; o nome comercial do pacote vai em
  `observacao_pacote` (texto livre).
- **Atenção na implementação:** compare sempre de forma explícita (`situacao = 1`). No SQLite,
  `WHERE situacao` trata `-1` (ausente) como verdadeiro e `0` (opcional) como falso. No JSON use os
  nomes (`"serie"`, `"opcional"`, `"ausente"`), convertidos na carga.
- Itens por versão e ano devem ser um objeto com chave (`"equipamentos": { "camera-re": "serie" }`),
  não uma lista: assim uma mudança de um ano altera um item sem reescrever os outros (ver regra de
  `mudancas` em FORMATO.md).
