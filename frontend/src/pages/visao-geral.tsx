
import { Link } from "react-router-dom";

function VisaoGeral() {
    return (
        <>
            <header className="cabecalho">
                <div>
                    <p className="sobretitulo">SEU ESPAÇO DE APRENDIZADO</p>
                    <h1>Olá, estudante! <span>✦</span></h1>
                    <p className="subtitulo">
                        Vamos organizar seus estudos de hoje?
                    </p>
                </div>

                <div className="data-hoje">
                    <span>✧</span> Meu StudyFlow
                </div>
            </header>

            <section className="destaque">
                <div>
                    <span className="etiqueta">SEU PRÓXIMO PASSO</span>
                    <h2>Transforme seus planos<br />em conquistas.</h2>
                    <p>
                        Organize suas tarefas e deixe o StudyFlow ajudar
                        você a priorizar.
                    </p>
                    <Link to="/tarefas" className="botao-destaque">
                        Organizar minhas tarefas <span>→</span>
                    </Link>
                </div>

                <div className="ilustracao" aria-hidden="true">
                    <div className="orbita orbita-1"></div>
                    <div className="orbita orbita-2"></div>
                    <div className="livro">✧</div>
                    <div className="brilho brilho-1">✦</div>
                    <div className="brilho brilho-2">✧</div>
                </div>
            </section>

            <section className="secao-resumo">
                <div className="titulo-secao">
                    <div>
                        <h2>Seu progresso</h2>
                        <p>Um resumo da sua jornada de estudos.</p>
                    </div>
                </div>

                <div className="grade-resumo">
                    <article className="cartao-resumo">
                        <div className="icone-resumo lilas">▤</div>
                        <div>
                            <span>Disciplinas</span>
                            <strong>—</strong>
                            <small>no seu espaço</small>
                        </div>
                    </article>

                    <article className="cartao-resumo">
                        <div className="icone-resumo azul">☑</div>
                        <div>
                            <span>Tarefas pendentes</span>
                            <strong>—</strong>
                            <small>para organizar</small>
                        </div>
                    </article>

                    <article className="cartao-resumo">
                        <div className="icone-resumo amarelo">◷</div>
                        <div>
                            <span>Tempo de estudo</span>
                            <strong>0h</strong>
                            <small>registradas</small>
                        </div>
                    </article>
                </div>
            </section>

            <section className="secao-disciplinas">
                <div className="titulo-secao">
                    <div>
                        <h2>Vamos começar?</h2>
                        <p>Escolha o que deseja organizar hoje.</p>
                    </div>
                </div>

                <div className="lista-disciplinas">
                    <Link to="/disciplinas" className="item-disciplina">
                        <div className="icone-disciplina" style={{ backgroundColor: "#8B5CF6" }}>
                            ✦
                        </div>
                        <div className="info-disciplina">
                            <strong>Minhas disciplinas</strong>
                            <span>Organize suas matérias e avaliações.</span>
                        </div>
                        <span className="seta-disciplina">→</span>
                    </Link>

                    <Link to="/tarefas" className="item-disciplina">
                        <div className="icone-disciplina" style={{ backgroundColor: "#38BDF8" }}>
                            ☑
                        </div>
                        <div className="info-disciplina">
                            <strong>Minhas tarefas</strong>
                            <span>Cadastre atividades e acompanhe prazos.</span>
                        </div>
                        <span className="seta-disciplina">→</span>
                    </Link>
                </div>
            </section>
        </>
    );
}

export default VisaoGeral;
