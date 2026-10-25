// Integração opcional com o Google Gemini, chamada apenas pelo servidor.
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const iaDisponivel = () => Boolean(process.env.GEMINI_API_KEY);

async function gerar(prompt, sistema) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
  const corpo = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: sistema }] },
  });
  let ultimoErro;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: corpo,
        signal: AbortSignal.timeout(30_000),
      });
      if (r.status === 400 || r.status === 403) {
        const e = new Error(`Gemini ${r.status}`); e.status = 502; e.publico = 'A chave ou o modelo do Gemini foi recusado.'; throw e;
      }
      if (!r.ok) throw new Error(`Gemini ${r.status}`);
      const dados = await r.json();
      const texto = dados.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      if (!texto) throw new Error('Resposta vazia do Gemini');
      return texto;
    } catch (e) {
      if (e.publico) throw e;
      ultimoErro = e;
      await new Promise((res) => setTimeout(res, 2 ** tentativa * 1000));
    }
  }
  const e = new Error(`Falha no Gemini: ${ultimoErro?.message}`); e.status = 502; e.publico = 'O serviço de IA não respondeu. Tente novamente.';
  throw e;
}

// Resumo compacto da ficha (só campos preenchidos) para o prompt
function resumo(f) {
  const partes = [
    `${f.marca} ${f.modelo} ${f.versao} (${f.ano_modelo}), ${f.categoria}`,
    f.motor.codigo && `motor ${f.motor.codigo}`,
    f.motor.combustivel,
    f.motor.potencia_max_cv && `${f.motor.potencia_max_cv} cv`,
    (f.motor.torque_kgfm_etanol || f.motor.torque_kgfm) && `${f.motor.torque_kgfm_etanol || f.motor.torque_kgfm} kgfm`,
    f.transmissao.cambio && `câmbio ${f.transmissao.cambio}${f.transmissao.marchas ? ` ${f.transmissao.marchas} marchas` : ''}`,
    f.transmissao.tracao && `tração ${f.transmissao.tracao}`,
    f.desempenho.zero_a_cem_s && `0-100 em ${f.desempenho.zero_a_cem_s}s`,
    f.consumo.urbano_gasolina && `consumo urbano ${f.consumo.urbano_gasolina} km/l (gasolina)`,
    f.eletrico?.autonomia_km && `autonomia ${f.eletrico.autonomia_km} km`,
    f.dimensoes.porta_malas_l && `porta-malas ${f.dimensoes.porta_malas_l} L`,
  ];
  return partes.filter(Boolean).join(', ');
}

export function analisarVersao(ficha) {
  return gerar(`Analise esta versão: ${resumo(ficha)}.`,
    'Você é um jornalista automotivo brasileiro. Em até 150 palavras, em português, descreva o perfil de uso desta versão, '
    + 'para quem ela faz sentido e cite um ponto forte e um ponto fraco. Baseie-se apenas nos dados fornecidos; '
    + 'não invente números. Texto corrido, sem markdown.');
}

export function compararVersoes(fichas) {
  return gerar(`Compare:\n${fichas.map((f, i) => `${i + 1}. ${resumo(f)}`).join('\n')}`,
    'Você é um jornalista automotivo brasileiro. Compare as versões em até 220 palavras, em português: '
    + 'qual é melhor para uso urbano, qual para estrada, e um veredito final. Use apenas os dados fornecidos; '
    + 'não invente números. Texto corrido, sem markdown.');
}
