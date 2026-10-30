
import { useEffect } from "react";
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
                        <h3>Um passo de cada vez!</h3>
                        <p>Pequenos progressos também são progressos.</p>
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
