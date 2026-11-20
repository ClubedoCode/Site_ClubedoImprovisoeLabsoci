import { useEffect, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTema } from '../context/TemaContext';
import Topbar from './Topbar';
import Footer from './Footer';

export default function Layout() {
  const tema = useTema();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const estiloTema = tema.cor
    ? ({
        '--orange': tema.cor,
        '--orange-hover': tema.cor,
        '--orange-light': tema.cor,
        '--gold': tema.cor,
      } as CSSProperties)
    : undefined;

  return (
    <div style={estiloTema}>
      <Topbar instagram={tema.instagram} />
      <Outlet />
      <Footer nome={tema.nome} />
    </div>
  );
}