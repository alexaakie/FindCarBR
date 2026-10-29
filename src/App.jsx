import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ComparadorProvider } from './lib/comparador.jsx';
import { PreferenciasProvider } from './lib/preferencias.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalogo from './pages/Catalogo.jsx';
import { Marca, Marcas, Modelo } from './pages/Marcas.jsx';
import Versao from './pages/Versao.jsx';
import Comparar from './pages/Comparar.jsx';
import Fipe from './pages/Fipe.jsx';
import Rankings from './pages/Rankings.jsx';

function RolarAoTopo() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function NaoEncontrado() {
  return (
    <div className="py-32 text-center">
      <p className="font-titulo text-7xl font-black text-borda">404</p>
      <p className="mt-2 text-tinta-2">Página não encontrada.</p>
      <Link to="/" className="botao mt-6 bg-tinta text-white">Voltar ao início</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PreferenciasProvider>
        <ComparadorProvider>
          <RolarAoTopo />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalogo" element={<Catalogo />} />
              <Route path="marcas" element={<Marcas />} />
              <Route path="marca/:slug" element={<Marca />} />
              <Route path="marca/:marca/:modelo" element={<Modelo />} />
              <Route path="versao/:slug" element={<Versao />} />
              <Route path="comparar" element={<Comparar />} />
              <Route path="rankings" element={<Rankings />} />
              <Route path="fipe" element={<Fipe />} />
              <Route path="*" element={<NaoEncontrado />} />
            </Route>
          </Routes>
        </ComparadorProvider>
      </PreferenciasProvider>
    </BrowserRouter>
  );
}
