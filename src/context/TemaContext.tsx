import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { temaClube, temaLabSoci, type Tema } from '../config/temas';
import { useFavicon } from '../hooks/useFavicon';

const TemaContext = createContext<Tema>(temaClube);
const TemaFixoContext = createContext<(tema: Tema | null) => void>(() => {});

export function TemaProvider({ children }: { children: ReactNode }) {
  // Sorteado uma única vez por visita
  const [sorteado] = useState(() => (Math.random() < 0.5 ? temaLabSoci : temaClube));
  const [fixo, setFixo] = useState<Tema | null>(null);

  const tema = fixo ?? sorteado;
  useFavicon(tema.icone);

  return (
    <TemaFixoContext.Provider value={setFixo}>
      <TemaContext.Provider value={tema}>{children}</TemaContext.Provider>
    </TemaFixoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTema = () => useContext(TemaContext);

/** Força um tema enquanto o componente estiver montado. */
// eslint-disable-next-line react-refresh/only-export-components
export function useTemaFixo(tema: Tema | null) {
  const definir = useContext(TemaFixoContext);

  useEffect(() => {
    definir(tema);
    return () => definir(null);
  }, [tema, definir]);
}