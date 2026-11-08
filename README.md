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

Para buscar fotos com licença livre (Wikimedia Commons) de cada modelo:

```bash
npm run db:fotos          # grava server/data/fotos.json — revise antes de commitar
```

Produção: `npm start` compila o site e serve site + API na mesma porta.

Banco de dados:

```bash
npm run db:validar                 # confere todos os JSON (rode antes de commitar)
npm run db:migrar -- --status      # versão do schema e migrações pendentes
npm run db:migrar                  # aplica as pendentes (o servidor também aplica sozinho ao abrir)
```

## Arquitetura

```
server/
  db.js                 conexão SQLite e aplicação das migrações
  migracoes.js          schema em migrações numeradas (marcas → modelos → gerações → versões → fichas, fontes, FIPE, busca FTS5)
  fichas.js             formato dos JSON: validação e expansão das faixas de anos
  consultas.js          consultas da API (filtros, ordenação, paginação, similares, fontes)
  index.js              API Express (+ serve o site compilado)
  ia.js                 Gemini, chamado só pelo servidor — a chave nunca vai para o navegador
  fipe-vinculo.js       liga cada versão ao código FIPE correspondente (automático)
  data/fichas/*.json    fichas técnicas curadas, um arquivo por marca (formato em data/FORMATO.md)
  data/fontes.json      registro das fontes citadas nas fichas
  data/fotos.json       fotos livres por modelo
  scripts/validar.js    valida os JSON (npm run db:validar; --expandir mostra as faixas de anos)
  scripts/popular.js    carrega os JSON no banco, que passa a refletir exatamente o Git
  scripts/migrar.js     situação e aplicação das migrações
  scripts/importar-fipe.js  importa a Tabela FIPE da API pública
  scripts/buscar-fotos.js   fotos livres da Wikipédia/Commons → data/fotos.json
src/
  pages/                Início, Catálogo, Marcas/Marca/Modelo, Versão, Comparar, Rankings, FIPE
  components/           layout, cards, estados de carregamento/erro, custos, análise IA
  lib/                  cliente da API, formatação pt-BR, comparador, preferências de custo
docs/
  DECISOES.md           decisões de arquitetura e regras de negócio
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

- **Fonte de verdade: os JSON no Git.** O banco é gerado a partir deles por `npm run db:popular`;
  alterar só o banco não vale (a próxima carga desfaz). Ver `docs/DECISOES.md`.
- A base cobre os carros vendidos no Brasil de 2000 até hoje (regras da ampliação em `server/data/HISTORICO.md`).
- A curadoria inicial das fichas foi feita de memória, com assistência de IA, sem consulta a documentos
  e sem copiar outros sites. Por isso todas estão como **“a verificar”**, sem fontes registradas, e campos
  sem dado confiável ficam vazios. Ao conferir uma versão, registre a fonte (`fontes.json` + `"fontes"`
  na versão) e marque `"status_dados": "verificado"`.
- Uma versão vendida por vários anos pode ser escrita uma vez, com `"anos": [primeiro, último]` e o
  que mudou em `"mudancas"` (ver `server/data/FORMATO.md`).
- Cada versão é ligada automaticamente ao código FIPE mais parecido. Para fixar à mão, adicione
  `"fipe_codigo": "005540-0"` na versão, no JSON da marca.
- Fotos: imagem principal do artigo da Wikipédia, só quando a licença é livre (CC/domínio público),
  sempre com crédito ao autor. Para trocar, edite `fotos.json` e marque a entrada com `"manual": true`.
- A Tabela FIPE vem da API pública em <https://deividfortuna.github.io/fipe/>.

## Testes

```bash
npm test      # API, migrações, formato das fichas e importação FIPE (com servidor FIPE simulado)
npm run lint
```
