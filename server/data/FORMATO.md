# Formato das fichas técnicas (`server/data/fichas/<marca>.json`)

Cada arquivo descreve **uma marca**. Hierarquia (igual aos grandes catálogos automotivos):

```
Marca → Modelo → Geração → Versão (ano-modelo) → Ficha técnica
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

## Regras

- Valor desconhecido → `null`. **Nunca invente**: melhor vazio do que errado.
- Toda ficha entra no banco com `status_dados = "verificar"`. Depois de conferida no manual
  do fabricante/Inmetro, o status passa a `"verificado"` (pelo painel ou direto no banco).
- Rode `npm run db:validar` antes de commitar.
