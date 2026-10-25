import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ComparadorProvider } from './lib/comparador.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalogo from './pages/Catalogo.jsx';
import { Marca, Marcas, Modelo } from './pages/Marcas.jsx';
import Versao from './pages/Versao.jsx';
import Comparar from './pages/Comparar.jsx';
import Fipe from './pages/Fipe.jsx';

function RolarAoTopo() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function NaoEncontrado() {
  return (
    <div className="py-32 text-center">
      <p className="text-6xl font-black text-zinc-800">404</p>
      <p className="mt-2 text-zinc-400">Página não encontrada.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-marca-600 px-5 py-2.5 text-sm font-bold">Voltar ao início</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
            <Route path="fipe" element={<Fipe />} />
            <Route path="*" element={<NaoEncontrado />} />
          </Route>
        </Routes>
      </ComparadorProvider>
    </BrowserRouter>
  );
}
