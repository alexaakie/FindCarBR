# Formato das fichas técnicas (`server/data/fichas/<marca>.json`)

Cada arquivo descreve **uma marca**. Hierarquia (igual aos grandes catálogos automotivos):

```
Marca → Modelo → Geração → Versão (um ou vários anos-modelo) → Ficha técnica
```

```jsonc
{
  "marca": { "nome": "Volkswagen", "pais": "Alemanha" },
  "modelos": [
    {
      "nome": "Polo",
      "categoria": "Hatch",              // Hatch | Sedan | SUV | Picape | Minivan | Esportivo | Utilitário | Cupê | Conversível | Perua
      "geracoes": [
        {
          "nome": "6ª geração (AW)",
          "ano_inicio": 2017,
          "ano_fim": null,               // null = em produção
          "versoes": [
            {
              "nome": "Highline 170 TSI",
              "ano_modelo": 2025,
              "carroceria": "Hatch",
              "portas": 4,
              "lugares": 5,
              "motor": {
                "codigo": "EA211 1.0 TSI",
                "cilindrada_cc": 999,
                "cilindros": 3,
                "valvulas": 12,
                "aspiracao": "Turbo",        // Aspirado | Turbo | Biturbo | Elétrico
                "injecao": "Direta",         // Direta | Multiponto | Indireta | Common-rail | null
                "combustivel": "Flex",       // Flex | Gasolina | Diesel | Elétrico | Híbrido | Híbrido Flex | Híbrido Plug-in
                "potencia_cv": 109,          // gasolina (ou única)
                "potencia_cv_etanol": 116,   // só para Flex
                "potencia_rpm": "5500",
                "torque_kgfm": 16.8,
                "torque_kgfm_etanol": 16.8,
                "torque_rpm": "1750-4000"
              },
              "eletrico": null,              // ou { "bateria_kwh": 60.5, "autonomia_km": 410, "recarga_dc_kw": 88 }
              "transmissao": {
                "cambio": "Automático",      // Manual | Automático | CVT | Dupla embreagem | Automatizado | Redução única
                "marchas": 6,
                "tracao": "Dianteira"        // Dianteira | Traseira | Integral
              },
              "desempenho": { "zero_a_cem_s": 10.1, "vel_max_kmh": 196 },
              "consumo": {                   // km/l, padrão Inmetro/PBEV
                "urbano_gasolina": 12.0, "estrada_gasolina": 14.1,
                "urbano_etanol": 8.4, "estrada_etanol": 9.8
              },
              "dimensoes": {
                "comprimento_mm": 4074, "largura_mm": 1751, "altura_mm": 1468,
                "entre_eixos_mm": 2566, "porta_malas_l": 300, "tanque_l": 52, "peso_kg": 1132
              },
              "suspensao": { "dianteira": "McPherson", "traseira": "Eixo de torção" },
              "freios": { "dianteiros": "Disco ventilado", "traseiros": "Tambor" },
              "pneus": "205/50 R17"
            }
          ]
        }
      ]
    }
  ]
}
```

## Uma versão em vários anos: `anos` + `mudancas`

Em vez de repetir a ficha a cada ano-modelo, escreva a versão uma vez com a faixa de anos em que foi
vendida e registre só o que mudou, no ano em que mudou:

```jsonc
{
  "nome": "Comfortline 200 TSI",
  "anos": [2018, 2022],                 // primeiro e último ano-modelo, inclusive
  "motor": { "codigo": "EA211 1.0 TSI", "combustivel": "Flex", "potencia_cv": 128, "potencia_cv_etanol": 128 },
  "transmissao": { "cambio": "Automático", "marchas": 6, "tracao": "Dianteira" },
  "pneus": "195/55 R16",
  "mudancas": {
    "2020": { "motor": { "potencia_cv": 116 } },           // vale de 2020 em diante
    "2021": { "pneus": "205/50 R17", "dimensoes": { "peso_kg": null } }
  }
}
```
*(valores ilustrativos)*

A carga gera uma ficha por ano (2018, 2019, 2020, 2021, 2022), cada uma com endereço próprio.
Regras das mudanças:

- A chave é o ano em que a mudança **entra**; ela continua valendo nos anos seguintes até outra mudança.
- Objetos (`motor`, `consumo`…) se combinam campo a campo: só o que aparece na mudança é alterado.
- `null` apaga o dado a partir daquele ano. Listas são substituídas inteiras (por isso, dados que mudam
  item a item devem ser objetos com chave, nunca listas).
- O primeiro ano vai na base, não em `mudancas`. `nome`, `anos` e `ano_modelo` não podem mudar:
  mudou o nome da versão = outra versão.
- Todos os anos precisam caber na geração (`ano_inicio`…`ano_fim`).
- Só use uma faixa quando tiver confiança de que a versão existiu em todos aqueles anos. Se souber
  de um ano só, use o formato simples `"ano_modelo": 2019`, que continua valendo.

Para conferir o resultado: `node server/scripts/validar.js --expandir server/data/fichas/<marca>.json`.

## Fontes

Cada fonte é cadastrada uma vez em `server/data/fontes.json`:

```jsonc
{
  "inmetro-pbev-2025": {
    "tipo": "inmetro",                  // fabricante | inmetro | latin-ncap | imprensa | outro
    "titulo": "Tabela PBEV veicular 2025",
    "url": "https://...",               // opcional
    "data": "2025-03",                  // opcional: AAAA-MM ou AAAA-MM-DD (publicação ou acesso)
    "observacao": "..."                 // opcional
  }
}
```

E cada versão diz quais fontes valem para cada seção da ficha:

```jsonc
"fontes": {
  "motor": ["vw-ficha-polo-2025"],
  "consumo": ["inmetro-pbev-2025"],
  "*": ["vw-ficha-polo-2025"]           // "*" = as demais seções (as não listadas acima)
}
```

Uma seção listada substitui o `"*"` para aquela seção. Assim, numa mudança de ano, `"fontes": { "consumo": ["inmetro-pbev-2021"] }`
troca só a fonte do consumo e mantém as outras. Para não indicar fonte numa seção, use `null`.

Seções: `geral` (carroceria, portas, lugares), `motor`, `eletrico`, `transmissao`, `desempenho`,
`consumo`, `dimensoes`, `chassi` (suspensão, freios e pneus). `fontes` também pode aparecer em
`mudancas`, quando a fonte de um ano for outra. Só registre fontes que você consultou de verdade.

## Outros campos da versão

- `status_dados`: `"verificar"` (padrão) ou `"verificado"`.
- `fipe_codigo`: código FIPE fixado à mão (`"005540-0"`). Sem ele, a carga escolhe o mais parecido.

## Regras

- Valor desconhecido → `null`. **Nunca invente**: melhor vazio do que errado.
- Campos fora deste formato são recusados pelo validador (pega erros de digitação como `"consumos"`).
- Um arquivo por marca, e cada modelo aparece uma vez no arquivo (gerações e versões ficam juntas no mesmo bloco).
- Toda ficha entra no banco com `status_dados = "verificar"`. Depois de conferida com a fonte,
  marque `"status_dados": "verificado"` no JSON. O banco segue o JSON: alterar só o banco não vale,
  a próxima carga desfaz (ver `docs/DECISOES.md`).
- Rode `npm run db:validar` antes de commitar.
