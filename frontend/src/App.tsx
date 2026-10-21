
import { BrowserRouter, NavLink, Route, Routes, Navigate } from "react-router-dom";
import VisaoGeral from "./pages/visao-geral";
import MinhasTarefas from "./pages/minhas-tarefas";
import Disciplinas from "./pages/disciplinas";
import "./App.css";

function App() {
    return (
        <BrowserRouter>
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

                    <div className="perfil">
                        <div className="avatar">V</div>
                        <div>
                            <strong>Meu espaço</strong>
                            <span>Estudante</span>
                        </div>
                    </div>
                </aside>

                <main className="conteudo">
                    <Routes>
                        <Route path="/" element={<Navigate to="/inicio" replace />} />
                        <Route path="/inicio" element={<VisaoGeral />} />
                        <Route path="/disciplinas" element={<Disciplinas />} />
                        <Route path="/tarefas" element={<MinhasTarefas />} />
                        <Route
                            path="/planejamento"
                            element={
                                <section className="secao-disciplinas">
                                    <header className="cabecalho">
                                        <div>
                                            <p className="sobretitulo">SUA ROTINA</p>
                                            <h1>Planejamento <span>✦</span></h1>
                                            <p className="subtitulo">
                                                Em breve, seu planejamento inteligente de estudos.
                                            </p>
                                        </div>
                                    </header>
                                </section>
                            }
                        />
                        <Route path="*" element={<Navigate to="/inicio" replace />} />
                    </Routes>

                    <footer className="rodape">
                        <span>StudyFlow</span> · Construindo uma rotina de estudos mais leve.
                    </footer>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
