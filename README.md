# FindCarBR

Catálogo de fichas técnicas de carros vendidos no Brasil: motor, câmbio, desempenho, consumo, dimensões e chassi,
versão por versão. Inclui comparador lado a lado, Tabela FIPE e análise opcional por IA. Sem anúncios.

## Como rodar

Requer **Node.js 22.13 ou mais novo** (o banco usa o SQLite nativo do Node, sem dependências nativas).

```bash
npm install
cp .env.example .env      # opcional: chave do Gemini, token FIPE
npm run db:popular        # cria server/data/findcar.db a partir das fichas JSON
npm run dev               # API em :3001 + site em http://localhost:5173
```

Para importar a Tabela FIPE (todas as marcas e modelos do mercado):

```bash
npm run db:fipe -- --marcas=volkswagen,fiat   # algumas marcas
npm run db:fipe                               # tudo (demorado; é retomável)
npm run db:fipe -- --sem-precos               # só marcas/modelos/anos, bem mais rápido
```

Produção: `npm start` compila o site e serve site + API na mesma porta.

## Arquitetura

```
server/
  db.js                 schema SQLite (marcas → modelos → gerações → versões → fichas, FIPE, busca FTS5)
  consultas.js          consultas da API (filtros, ordenação, paginação, similares)
  index.js              API Express (+ serve o site compilado)
  ia.js                 Gemini, chamado só pelo servidor — a chave nunca vai para o navegador
  data/fichas/*.json    fichas técnicas curadas, um arquivo por marca (formato em data/FORMATO.md)
  scripts/validar.js    valida os JSON (enums, faixas plausíveis, duplicatas)
  scripts/popular.js    carrega os JSON no banco (idempotente)
  scripts/importar-fipe.js  importa a Tabela FIPE da API pública
src/
  pages/                Início, Catálogo, Marcas/Marca/Modelo, Versão, Comparar, FIPE
  components/           layout, cards, estados de carregamento/erro, análise IA
  lib/                  cliente da API, formatação pt-BR, estado do comparador
```

### API

| Rota | Descrição |
|---|---|
| `GET /api/versoes` | Lista com filtros: `q`, `marca`, `categoria`, `combustivel`, `tracao`, `cambio` (aceitam vários, separados por vírgula), `ano_min/max`, `pot_min/max`, `apenas_atuais=1`, `ordem`, `pagina`, `por_pagina` |
| `GET /api/versoes/:slug` | Ficha completa + preços FIPE + outras versões + concorrentes |
| `GET /api/comparar?slugs=a,b,c` | Até 4 fichas |
| `GET /api/marcas`, `/api/marcas/:slug`, `/api/modelos/:marca/:modelo` | Navegação hierárquica |
| `GET /api/fipe` | Busca na Tabela FIPE (`q`, `marca`, `ano`) |
| `GET /api/filtros`, `/api/estatisticas` | Valores para os filtros e contadores |
| `POST /api/ia/analise`, `/api/ia/comparar` | Texto gerado pelo Gemini (precisa de `GEMINI_API_KEY`) |

## Sobre os dados

- As fichas em `server/data/fichas` foram escritas a partir de dados públicos de fabricantes e do Inmetro,
  **não** copiadas de outros sites. Todas entram como **“a verificar”**; campos sem dado confiável ficam vazios.
- Para corrigir ou ampliar: edite o JSON da marca, rode `npm run db:validar` e `npm run db:popular`.
  Ao conferir uma versão com a fonte oficial, adicione `"status_dados": "verificado"` nela.
- A Tabela FIPE vem da API pública em <https://deividfortuna.github.io/fipe/>.

## Testes

```bash
npm test      # API + importação FIPE (com servidor FIPE simulado)
npm run lint
```
