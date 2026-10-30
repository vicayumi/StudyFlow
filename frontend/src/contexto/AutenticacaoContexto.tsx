import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { limparToken, sair as encerrarSessao, usuarioAtual, type Usuario } from "../services/autenticacao";

interface ContextoAutenticacao {
    usuario: Usuario | null;
    carregando: boolean;
    definirUsuario: (usuario: Usuario) => void;
    sair: () => Promise<void>;
}

const Contexto = createContext<ContextoAutenticacao | null>(null);

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (!localStorage.getItem("studyflow_token")) {
            setCarregando(false);
            return;
        }
        void usuarioAtual()
            .then(setUsuario)
            .catch(() => {
                limparToken();
                setUsuario(null);
            })
            .finally(() => setCarregando(false));
    }, []);

    async function sair() {
        try {
            await encerrarSessao();
        } catch {
            // A sessão local já é removida mesmo se a API estiver indisponível.
        } finally {
            setUsuario(null);
        }
    }

    return (
        <Contexto.Provider value={{ usuario, carregando, definirUsuario: setUsuario, sair }}>
            {children}
        </Contexto.Provider>
    );
}

export function useAutenticacao(): ContextoAutenticacao {
    const contexto = useContext(Contexto);
    if (!contexto) throw new Error("useAutenticacao precisa estar dentro de ProvedorAutenticacao.");
    return contexto;
}
