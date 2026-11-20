import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface Admin {
  /** true se quem está navegando tem sessão de admin válida */
  admin: boolean;
  /** Nome do admin logado (null se não houver sessão) */
  usuario: string | null;
  /** true até o servidor responder se há sessão */
  carregando: boolean;
  entrar: (usuario: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const AdminContext = createContext<Admin>({
  admin: false,
  usuario: null,
  carregando: true,
  entrar: async () => {},
  sair: async () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const admin = usuario !== null;

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/sessao", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) =>
        setUsuario(json?.data?.admin ? (json.data.usuario ?? "Admin") : null),
      )
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setUsuario(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, []);

  async function entrar(nome: string, senha: string) {
    const resposta = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: nome, senha }),
    });
    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(json.error || "Não foi possível entrar.");
    setUsuario(json?.data?.usuario ?? nome);
  }

  async function sair() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    setUsuario(null);
  }

  return (
    <AdminContext.Provider
      value={{ admin, usuario, carregando, entrar, sair }}
    >
      {children}
    </AdminContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => useContext(AdminContext);
