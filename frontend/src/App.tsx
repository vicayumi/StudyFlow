
import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes, Navigate, Outlet } from "react-router-dom";
import VisaoGeral from "./pages/visao-geral";
import MinhasTarefas from "./pages/minhas-tarefas";
import Disciplinas from "./pages/disciplinas";
import Planejamento from "./pages/planejamento";
import Estudar from "./pages/estudar";
import Configuracoes from "./pages/configuracoes";
import Autenticacao from "./pages/autenticacao";
import { ProvedorAutenticacao, useAutenticacao } from "./contexto/AutenticacaoContexto";
import "./App.css";

function RotaProtegida() {
    const { usuario, carregando } = useAutenticacao();
    if (carregando) return <div className="carregando-aplicativo">Carregando seu espaço...</div>;
    return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}

function LayoutPrincipal() {
    const { usuario, sair } = useAutenticacao();
    const frasesMotivacionais = [
        "Cada minuto de dedicação aproxima você do seu objetivo.",
        "Você não precisa fazer tudo hoje. Só precisa dar o próximo passo.",
        "Pequenos avanços, repetidos com carinho, viram grandes conquistas.",
        "Seu esforço de hoje é um presente para o seu eu do futuro.",
        "Continue no seu ritmo: constância vale mais que pressa.",
        "Aprender leva tempo — e você está investindo bem o seu.",
        "Uma sessão de cada vez. Você está no caminho certo."
    ];
    const [indiceFrase, setIndiceFrase] = useState(0);

    useEffect(() => {
        function verificarLembrete() {
            if (localStorage.getItem("studyflow_lembrete_ativo") !== "true" || typeof Notification === "undefined" || Notification.permission !== "granted") return;
            const agora = new Date();
            const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
            let lembretes: { id: string; hora: string }[] = [];
            try {
                lembretes = JSON.parse(localStorage.getItem("studyflow_lembretes") || "[]") as { id: string; hora: string }[];
            } catch { /* Usa a configuração anterior se a lista estiver inválida. */ }
            if (lembretes.length === 0) {
                const legado = localStorage.getItem("studyflow_lembrete_horario") || "18:00";
                lembretes = [{ id: `lembrete-${legado}`, hora: legado }];
            }
            const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
            const chaveEnvios = `studyflow_lembretes_enviados_${hoje}`;
            let enviados: string[] = [];
            try { enviados = JSON.parse(localStorage.getItem(chaveEnvios) || "[]") as string[]; } catch { /* Reinicia os envios do dia. */ }
            for (const lembrete of lembretes) {
                if (horaAtual < lembrete.hora || enviados.includes(lembrete.id)) continue;
                enviados.push(lembrete.id);
                localStorage.setItem(chaveEnvios, JSON.stringify(enviados));
                const aviso = new Notification("Hora de estudar?", {
                    body: `Seu lembrete das ${lembrete.hora} chegou. Abra o StudyFlow e escolha seu próximo passo.`,
                    icon: "/logo-studyflow.png",
                    requireInteraction: false
                });
                aviso.onclick = () => { window.focus(); aviso.close(); };
            }
        }
        verificarLembrete();
        const intervalo = window.setInterval(verificarLembrete, 15000);
        document.addEventListener("visibilitychange", verificarLembrete);
        return () => {
            window.clearInterval(intervalo);
            document.removeEventListener("visibilitychange", verificarLembrete);
        };
    }, []);

    return (
        <div className="aplicativo">
                <aside className="menu-lateral">
                    <div className="marca">
                        <img
                            className="marca-imagem"
                            src="/logo-studyflow.png"
                            alt="Logo do StudyFlow"
                        />
                        <span>StudyFlow</span>
                    </div>

                    <p className="menu-titulo">MENU PRINCIPAL</p>

                    <nav className="navegacao">
                        <NavLink
                            to="/inicio"
                            className={({ isActive }) =>
                                `link-menu ${isActive ? "ativo" : ""}`
                            }
                        >
                            ▦ <span>Visão geral</span>
                        </NavLink>

                        <NavLink
                            to="/disciplinas"
                            className={({ isActive }) =>
                                `link-menu ${isActive ? "ativo" : ""}`
                            }
                        >
                            ▤ <span>Disciplinas</span>
                        </NavLink>

                        <NavLink
                            to="/tarefas"
                            className={({ isActive }) =>
                                `link-menu ${isActive ? "ativo" : ""}`
                            }
                        >
                            ☑ <span>Minhas tarefas</span>
                        </NavLink>

                        <NavLink
                            to="/estudar"
                            className={({ isActive }) => `link-menu ${isActive ? "ativo" : ""}`}
                        >
                            ◷ <span>Estudar</span>
                        </NavLink>

                        <NavLink
                            to="/planejamento"
                            className={({ isActive }) =>
                                `link-menu ${isActive ? "ativo" : ""}`
                            }
                        >
                            ▦ <span>Planejamento</span>
                        </NavLink>
                    </nav>

                    <div className="cartao-motivacao">
                        <span className="estrela">✦</span>
                        <p className="frase-gerada-sidebar" aria-live="polite">“{frasesMotivacionais[indiceFrase]}”</p>
                        <button
                            type="button"
                            onClick={() => setIndiceFrase((atual) => (atual + 1) % frasesMotivacionais.length)}
                        >
                            Nova frase
                        </button>
                    </div>

                    <NavLink
                        to="/configuracoes"
                        className={({ isActive }) =>
                            `link-menu link-configuracoes ${isActive ? "ativo" : ""}`
                        }
                    >
                        ⚙ <span>Configurações</span>
                    </NavLink>

                    <div className="perfil">
                        <div className="avatar">{usuario?.nome.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong>{usuario?.nome}</strong>
                            <span>{usuario?.instituicao}</span>
                        </div>
                        <button type="button" className="botao-sair" onClick={() => void sair()} aria-label="Sair da conta" title="Sair">↪</button>
                    </div>
                </aside>

                <main className="conteudo">
                    <Outlet />
                    <footer className="rodape">
                        <span>StudyFlow</span> · Construindo uma rotina de estudos mais leve.
                    </footer>
                </main>
        </div>
    );
}

function App() {
    useEffect(() => {
        document.documentElement.dataset.theme =
            localStorage.getItem("studyflow_tema") === "escuro" ? "escuro" : "claro";
        document.documentElement.dataset.texto = localStorage.getItem("studyflow_texto_grande") === "true" ? "grande" : "normal";
        document.documentElement.dataset.animacoes = localStorage.getItem("studyflow_reduzir_animacoes") === "true" ? "reduzidas" : "normais";
    }, []);

    return (
        <BrowserRouter>
            <ProvedorAutenticacao>
                <Routes>
                    <Route path="/login" element={<Autenticacao modo="login" />} />
                    <Route path="/cadastro" element={<Autenticacao modo="cadastro" />} />
                    <Route element={<RotaProtegida />}>
                        <Route element={<LayoutPrincipal />}>
                            <Route path="/" element={<Navigate to="/inicio" replace />} />
                            <Route path="/inicio" element={<VisaoGeral />} />
                            <Route path="/disciplinas" element={<Disciplinas />} />
                            <Route path="/tarefas" element={<MinhasTarefas />} />
                            <Route path="/planejamento" element={<Planejamento />} />
                            <Route path="/estudar" element={<Estudar />} />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            <Route path="*" element={<Navigate to="/inicio" replace />} />
                        </Route>
                    </Route>
                </Routes>
            </ProvedorAutenticacao>
        </BrowserRouter>
    );
}

export default App;
