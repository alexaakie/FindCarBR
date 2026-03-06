import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Gauge, Settings2, ShieldCheck, Zap, Fuel, 
  Activity, ArrowRight, X, Layers, Plus, Sparkles, 
  Loader2, MessageSquareText, Scale, Info
} from 'lucide-react';

// Dados atualizados incluindo a entidade "Versão"
const CAR_DATA = [
  {
    id: 1,
    marca: "BMW",
    modelo: "320i",
    versao: "M Sport",
    ano: 2024,
    categoria: "Sedan",
    motor: { codigo: "B48 Turbo", cil: "2.0", potencia: 184, torque: 30.6, combustivel: "Gasolina" },
    cambio: { tipo: "Automático", marchas: 8, codigo: "ZF 8HP" },
    tracao: "Traseira (RWD)",
    performance: { zero_a_cem: 7.1, vel_max: 235 },
    consumo: { urbano: 10.6, rodoviario: 13.2 },
    imagem: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 2,
    marca: "Volkswagen",
    modelo: "Polo",
    versao: "Highline",
    ano: 2024,
    categoria: "Hatch",
    motor: { codigo: "EA211 TSI", cil: "1.0", potencia: 116, torque: 16.8, combustivel: "Flex" },
    cambio: { tipo: "Automático", marchas: 6, codigo: "Aisin AQ250" },
    tracao: "Dianteira (FWD)",
    performance: { zero_a_cem: 10.5, vel_max: 192 },
    consumo: { urbano: 12.2, rodoviario: 15.1 },
    imagem: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 3,
    marca: "Toyota",
    modelo: "Corolla",
    versao: "Altis Premium",
    ano: 2024,
    categoria: "Sedan",
    motor: { codigo: "Dynamic Force", cil: "2.0", potencia: 177, torque: 21.4, combustivel: "Flex" },
    cambio: { tipo: "CVT", marchas: 10, codigo: "Direct Shift" },
    tracao: "Dianteira (FWD)",
    performance: { zero_a_cem: 9.2, vel_max: 205 },
    consumo: { urbano: 11.9, rodoviario: 14.2 },
    imagem: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 4,
    marca: "Jeep",
    modelo: "Compass",
    versao: "Longitude",
    ano: 2024,
    categoria: "SUV",
    motor: { codigo: "GSE T270", cil: "1.3", potencia: 185, torque: 27.5, combustivel: "Flex" },
    cambio: { tipo: "Automático", marchas: 6, codigo: "Aisin AT6" },
    tracao: "Dianteira (FWD)",
    performance: { zero_a_cem: 8.8, vel_max: 207 },
    consumo: { urbano: 10.1, rodoviario: 12.0 },
    imagem: "https://images.unsplash.com/photo-1611016186353-9af58c69a533?auto=format&fit=crop&q=80&w=800"
  }
];

async function callGemini(prompt, systemInstruction = "") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
  };

  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
      if (i === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTracao, setFilterTracao] = useState("Todas");
  const [selectedCar, setSelectedCar] = useState(null);
  const [compareList, setCompareList] = useState([]);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");

  const filteredCars = useMemo(() => {
    return CAR_DATA.filter(car => {
      const searchStr = `${car.marca} ${car.modelo} ${car.versao}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesTracao = filterTracao === "Todas" || car.tracao.includes(filterTracao);
      return matchesSearch && matchesTracao;
    });
  }, [searchTerm, filterTracao]);

  const toggleCompare = (car) => {
    if (compareList.find(c => c.id === car.id)) {
      setCompareList(compareList.filter(c => c.id !== car.id));
    } else if (compareList.length < 2) {
      setCompareList([...compareList, car]);
    }
    setAiResult("");
  };

  const handleConsultarIA = async (car) => {
    setAiLoading(true);
    setAiResult("");
    setAiError("");
    const systemPrompt = "Você é um jornalista automotivo especialista. Analise as especificações técnicas de um carro e sua versão. Forneça um resumo amigável: descreva o perfil da versão, o que a diferencia no mercado e cite um ponto forte e um fraco.";
    const userPrompt = `Analise: ${car.marca} ${car.modelo} versão ${car.versao} (${car.ano}). Motor: ${car.motor.codigo}, Potência: ${car.motor.potencia}cv, Câmbio: ${car.cambio.tipo}, Tração: ${car.tracao}.`;
    
    try {
      const result = await callGemini(userPrompt, systemPrompt);
      setAiResult(result);
    } catch (err) {
      setAiError("Falha na conexão com a inteligência.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCompararIA = async () => {
    if (compareList.length < 2) return;
    setAiLoading(true);
    setAiResult("");
    setAiError("");
    const [c1, c2] = compareList;
    
    const systemPrompt = "Compare duas versões de veículos. Destaque qual versão oferece melhor pacote técnico para: 1. Cidade, 2. Estrada. Conclua com um veredito técnico.";
    const userPrompt = `Compare: 
    V1: ${c1.marca} ${c1.modelo} ${c1.versao} (${c1.motor.potencia}cv, ${c1.tracao})
    V2: ${c2.marca} ${c2.modelo} ${c2.versao} (${c2.motor.potencia}cv, ${c2.tracao})`;
    
    try {
      const result = await callGemini(userPrompt, systemPrompt);
      setAiResult(result);
    } catch (err) {
      setAiError("Falha na análise comparativa.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-orange-600/30">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-[#0d0d0d]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-2 rounded-xl shadow-lg shadow-orange-600/20">
              <Activity size={24} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">
              Carros<span className="text-orange-600 font-extrabold">NaWeb</span>
              <span className="text-[10px] ml-1 bg-white/10 px-2 py-0.5 rounded-full not-italic tracking-normal text-gray-400">2.0</span>
            </span>
          </div>
          
          <div className="hidden lg:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Novos</a>
            <a href="#" className="hover:text-white transition-colors">Comparar</a>
            <a href="#" className="hover:text-white transition-colors">Fichas</a>
          </div>

          <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95">
            Área do Proprietário
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-20 pb-16 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-tight">
          A precisão técnica encontra o <br/>
          <span className="bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent">carro dos seus sonhos.</span>
        </h1>
        
        <div className="relative max-w-2xl mx-auto group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-600 transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Pesquise por marca, modelo ou versão..."
            className="w-full bg-[#161616] border border-white/10 focus:border-orange-600/50 rounded-3xl py-6 pl-16 pr-8 text-lg outline-none transition-all shadow-2xl focus:ring-4 focus:ring-orange-600/5"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {["Todas", "Traseira", "Dianteira", "Integral"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTracao(t)}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                filterTracao === t ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/30' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className="w-1 h-6 bg-orange-600 rounded-full"/>
            Catálogo de Versões
          </h2>
          <p className="text-sm text-gray-600 font-medium">{filteredCars.length} versões encontradas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredCars.map((car) => (
            <article 
              key={car.id} 
              className="group bg-[#141414] rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-orange-600/20 transition-all duration-500 flex flex-col shadow-lg"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={car.imagem} 
                  alt={`${car.modelo} ${car.versao}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-90" />
                
                <div className="absolute top-6 left-6">
                  <span className="bg-orange-600/90 backdrop-blur-md text-[10px] font-black px-4 py-1.5 rounded-full text-white uppercase tracking-widest shadow-lg">
                    {car.tracao}
                  </span>
                </div>

                <button 
                  onClick={() => toggleCompare(car)}
                  className={`absolute top-6 right-6 p-3 rounded-2xl backdrop-blur-xl transition-all border ${
                    compareList.find(c => c.id === car.id) 
                    ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/40 scale-110' 
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-black/60'
                  }`}
                >
                  {compareList.find(c => c.id === car.id) ? <ShieldCheck size={20} /> : <Plus size={20} />}
                </button>
              </div>

              <div className="p-10 pt-4">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{car.marca}</span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full" />
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{car.ano}</span>
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter leading-none mb-1">{car.modelo}</h3>
                  <p className="text-orange-500 font-bold text-sm uppercase tracking-widest">{car.versao}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-gray-600 uppercase mb-1 tracking-widest flex items-center gap-2">
                      <Zap size={12} /> Potência
                    </p>
                    <p className="text-xl font-black">{car.motor.potencia} <span className="text-[10px] text-gray-500">CV</span></p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-gray-600 uppercase mb-1 tracking-widest flex items-center gap-2">
                      <Gauge size={12} /> 0-100
                    </p>
                    <p className="text-xl font-black">{car.performance.zero_a_cem}<span className="text-[10px] text-gray-500">S</span></p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedCar(car)}
                  className="w-full bg-white text-black font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-xl"
                >
                  RAIO-X DA VERSÃO
                  <ArrowRight size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Floating Comparison */}
      {compareList.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl flex items-center gap-8 z-[60] animate-in fade-in slide-in-from-bottom-8">
          <div className="flex items-center gap-5">
            {compareList.map(car => (
              <div key={car.id} className="flex items-center gap-4 bg-black/40 pr-5 rounded-[1.5rem] overflow-hidden border border-white/5 group">
                <img src={car.imagem} className="w-14 h-14 object-cover" alt={car.modelo} />
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-gray-500 uppercase">{car.modelo}</span>
                   <span className="text-xs font-bold text-white truncate max-w-[80px]">{car.versao}</span>
                </div>
                <button onClick={() => toggleCompare(car)} className="ml-2 hover:text-orange-500 transition-colors"><X size={16} /></button>
              </div>
            ))}
            {compareList.length === 1 && (
              <div className="w-40 h-14 border-2 border-dashed border-white/10 rounded-[1.5rem] flex items-center justify-center text-[10px] font-black text-gray-600 uppercase tracking-widest">
                Selecione outro
              </div>
            )}
          </div>
          {compareList.length === 2 && (
            <button 
              onClick={handleCompararIA}
              disabled={aiLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase flex items-center gap-3 shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
            >
              {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Veredito das Versões
            </button>
          )}
        </div>
      )}

      {/* Comparison Modal (AI Results) */}
      {aiResult && compareList.length === 2 && !selectedCar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121212] w-full max-w-3xl p-10 md:p-16 rounded-[4rem] border border-purple-500/30 shadow-2xl relative">
            <button onClick={() => setAiResult("")} className="absolute top-10 right-10 p-3 bg-white/5 hover:bg-orange-600 rounded-full transition-colors"><X size={24}/></button>
            <div className="flex items-center gap-4 mb-10 text-purple-400">
              <Scale size={32} />
              <h3 className="text-3xl font-black uppercase tracking-tighter">Comparativo de Inteligência</h3>
            </div>
            <div className="text-gray-300 leading-relaxed whitespace-pre-line bg-purple-500/5 p-8 rounded-[2.5rem] border border-purple-500/10 text-lg">
              {aiResult}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (The Raio-X) */}
      {selectedCar && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#0d0d0d] w-full max-w-6xl my-auto rounded-[4rem] overflow-hidden border border-white/5 relative flex flex-col lg:row shadow-2xl">
            <button 
              onClick={() => setSelectedCar(null)}
              className="absolute top-8 right-8 z-10 p-4 bg-black/60 hover:bg-orange-600 rounded-full transition-all"
            >
              <X size={28} />
            </button>

            <div className="flex flex-col lg:flex-row h-full">
              {/* Image Side */}
              <div className="w-full lg:w-1/2 h-80 lg:h-auto relative">
                <img src={selectedCar.imagem} className="w-full h-full object-cover" alt={selectedCar.modelo} />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0d0d0d] hidden lg:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent lg:hidden" />
              </div>

              {/* Content Side */}
              <div className="w-full lg:w-1/2 p-10 lg:p-20 overflow-y-auto">
                <header className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-xs">{selectedCar.marca}</span>
                    <span className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-400">{selectedCar.ano}</span>
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none mb-2">{selectedCar.modelo}</h2>
                  <p className="text-2xl font-bold text-gray-500 italic">versão {selectedCar.versao}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="bg-orange-600/10 p-3 rounded-2xl text-orange-600">
                        <Settings2 size={28} />
                      </div>
                      <h4 className="font-black uppercase tracking-widest text-xs">Especificações da Versão</h4>
                    </div>
                    <ul className="space-y-5">
                      <li className="flex justify-between border-b border-white/5 pb-3">
                        <span className="text-gray-500 text-xs font-bold uppercase">Motorização</span>
                        <span className="font-bold text-sm">{selectedCar.motor.codigo}</span>
                      </li>
                      <li className="flex justify-between border-b border-white/5 pb-3">
                        <span className="text-gray-500 text-xs font-bold uppercase">Transmissão</span>
                        <span className="font-bold text-sm">{selectedCar.cambio.codigo}</span>
                      </li>
                      <li className="flex justify-between border-b border-white/5 pb-3">
                        <span className="text-gray-500 text-xs font-bold uppercase">Sistema Tração</span>
                        <span className="font-bold text-sm text-orange-400">{selectedCar.tracao}</span>
                      </li>
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-600">
                        <MessageSquareText size={28} />
                      </div>
                      <h4 className="font-black uppercase tracking-widest text-xs">Análise de Especialista</h4>
                    </div>
                    <button 
                      onClick={() => handleConsultarIA(selectedCar)}
                      disabled={aiLoading}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-[1.5rem] p-6 flex items-center justify-center gap-4 text-xs font-black uppercase transition-all disabled:opacity-50 shadow-inner"
                    >
                      {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles className="text-orange-600" size={20} />}
                      Consultar Perfil da Versão
                    </button>
                  </section>
                </div>

                {/* AI Consult Result */}
                {aiResult && (
                  <div className="animate-in fade-in slide-in-from-top-6 duration-700 bg-orange-600/5 border border-orange-600/20 p-10 rounded-[2.5rem] mb-12">
                    <div className="flex items-center gap-3 mb-5 text-orange-500">
                      <Info size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">IA: Perfil de Uso</span>
                    </div>
                    <p className="text-lg leading-relaxed text-gray-300 italic whitespace-pre-line font-medium">
                      "{aiResult}"
                    </p>
                  </div>
                )}

                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
                  <p className="text-[10px] font-black text-gray-600 uppercase mb-6 tracking-widest">Performance de Eficiência</p>
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-500">ESTRADA</span>
                        <span className="text-lg font-black text-green-500">{selectedCar.consumo.rodoviario} km/l</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{width: `${(selectedCar.consumo.rodoviario/16)*100}%`}} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-500">CIDADE</span>
                        <span className="text-lg font-black text-green-500">{selectedCar.consumo.urbano} km/l</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.3)]" style={{width: `${(selectedCar.consumo.urbano/16)*100}%`}} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;