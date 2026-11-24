
import { Link } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { useAutenticacao } from "../contexto/AutenticacaoContexto";
import { alterarSenha, atualizarPerfil, type DadosPerfil } from "../services/autenticacao";
import { listarDisciplinas } from "../services/disciplinas";
import { listarTarefas } from "../services/tarefas";
import NotificacaoTemporaria from "../components/notificacao-temporaria";

function VisaoGeral() {
    const { usuario, definirUsuario, sair } = useAutenticacao();
    const [resumo, setResumo] = useState<{
        disciplinas: number;
        pendentes: number;
        concluidas: number;
    } | null>(null);
    const [erroResumo, setErroResumo] = useState("");
    const [mostrarPerfil, setMostrarPerfil] = useState(false);
    const [mostrarMenuConta, setMostrarMenuConta] = useState(false);
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [erroSenha, setErroSenha] = useState("");
    const [salvandoSenha, setSalvandoSenha] = useState(false);
    const [sucessoConta, setSucessoConta] = useState("");
    const [perfil, setPerfil] = useState<DadosPerfil>({
        nome: "",
        email: "",
        nivelEstudo: "medio",
        instituicao: "",
        cursoSerie: "",
        cidade: ""
    });
    const [erroPerfil, setErroPerfil] = useState("");
    const [salvandoPerfil, setSalvandoPerfil] = useState(false);

    useEffect(() => {
        let ativo = true;

        async function carregarResumo() {
            try {
                const [disciplinas, tarefas] = await Promise.all([
                    listarDisciplinas(),
                    listarTarefas()
                ]);

                if (!ativo) {
                    return;
                }

                setResumo({
                    disciplinas: disciplinas.length,
                    pendentes: tarefas.filter(
                        (tarefa) => tarefa.estado === "pendente"
                    ).length,
                    concluidas: tarefas.filter(
                        (tarefa) => tarefa.estado === "concluida"
                    ).length
                });
            } catch (erro) {
                if (ativo) {
                    setErroResumo(
                        erro instanceof Error
                            ? erro.message
                            : "Não foi possível carregar o resumo."
                    );
                }
            }
        }

        void carregarResumo();

        return () => {
            ativo = false;
        };
    }, []);

    const valorResumo = (valor: number | undefined): number | string => {
        if (valor !== undefined) {
            return valor;
        }

        return erroResumo ? "—" : "…";
    };

    const primeiroNome = usuario?.nome.trim().split(/\s+/)[0] || "estudante";

    function abrirPerfil() {
        if (!usuario) return;
        setPerfil({
            nome: usuario.nome,
            email: usuario.email,
            nivelEstudo: usuario.nivelEstudo,
            instituicao: usuario.instituicao,
            cursoSerie: usuario.cursoSerie,
            cidade: usuario.cidade ?? ""
        });
        setErroPerfil("");
        setMostrarPerfil(true);
    }

    async function salvarPerfil(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setErroPerfil("");
        setSalvandoPerfil(true);
        try {
            const atualizado = await atualizarPerfil(perfil);
            definirUsuario(atualizado);
            setMostrarPerfil(false);
        } catch (falha) {
            setErroPerfil(falha instanceof Error ? falha.message : "Não foi possível atualizar seus dados.");
        } finally {
            setSalvandoPerfil(false);
        }
    }

    async function salvarSenha(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setErroSenha("");
        if (novaSenha !== confirmarSenha) {
            setErroSenha("A nova senha e a confirmação estão diferentes.");
            return;
        }
        setSalvandoSenha(true);
        try {
            await alterarSenha(senhaAtual, novaSenha);
            setSenhaAtual("");
            setNovaSenha("");
            setConfirmarSenha("");
            setMostrarSenha(false);
            setSucessoConta("Sua senha foi alterada com sucesso.");
        } catch (falha) {
            setErroSenha(falha instanceof Error ? falha.message : "Não foi possível alterar sua senha.");
        } finally {
            setSalvandoSenha(false);
        }
    }

    function atualizarCampo<K extends keyof DadosPerfil>(campo: K, valor: DadosPerfil[K]) {
        setPerfil((atual) => ({ ...atual, [campo]: valor }));
    }

    return (
        <>
            <header className="cabecalho">
                <div>
                    <p className="sobretitulo">SEU ESPAÇO DE APRENDIZADO</p>
                    <h1>Olá, {primeiroNome}! <span>✦</span></h1>
                    <p className="subtitulo">
                        Vamos organizar seus estudos de hoje?
                    </p>
                </div>

                <div className="menu-conta-container">
                    <button type="button" className="data-hoje botao-perfil" aria-expanded={mostrarMenuConta} aria-haspopup="menu" onClick={() => setMostrarMenuConta((aberto) => !aberto)}>
                        <span>✧</span> Meu StudyFlow <span aria-hidden="true">⌄</span>
                    </button>
                    {mostrarMenuConta && (
                        <div className="menu-conta" role="menu" aria-label="Menu da conta">
                            <div className="resumo-menu-conta"><strong>{usuario?.nome}</strong><span>{usuario?.email}</span></div>
                            <button type="button" role="menuitem" onClick={() => { setMostrarMenuConta(false); abrirPerfil(); }}>Dados pessoais</button>
                            <button type="button" role="menuitem" onClick={() => { setErroSenha(""); setMostrarMenuConta(false); setMostrarSenha(true); }}>Alterar senha</button>
                            <button type="button" role="menuitem" className="acao-sair-menu-conta" onClick={() => void sair()}>Sair da conta</button>
                        </div>
                    )}
                </div>
            </header>

            {sucessoConta && <NotificacaoTemporaria mensagem={sucessoConta} tipo="sucesso" />}

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

                {erroResumo && <NotificacaoTemporaria mensagem={erroResumo} tipo="erro" />}

                <div className="grade-resumo">
                    <article className="cartao-resumo">
                        <div className="icone-resumo lilas">▤</div>
                        <div>
                            <span>Disciplinas</span>
                            <strong>{valorResumo(resumo?.disciplinas)}</strong>
                            <small>no seu espaço</small>
                        </div>
                    </article>

                    <article className="cartao-resumo">
                        <div className="icone-resumo azul">☑</div>
                        <div>
                            <span>Tarefas pendentes</span>
                            <strong>{valorResumo(resumo?.pendentes)}</strong>
                            <small>para organizar</small>
                        </div>
                    </article>

                    <article className="cartao-resumo">
                        <div className="icone-resumo verde">✓</div>
                        <div>
                            <span>Tarefas concluídas</span>
                            <strong>{valorResumo(resumo?.concluidas)}</strong>
                            <small>com sucesso</small>
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

            {mostrarPerfil && (
                <div className="fundo-modal-perfil">
                    <section className="modal-perfil" role="dialog" aria-modal="true" aria-labelledby="titulo-perfil">
                        <button type="button" className="fechar-modal-perfil" onClick={() => setMostrarPerfil(false)} aria-label="Fechar edição do perfil">×</button>
                        <p className="sobretitulo">SUA CONTA</p>
                        <h2 id="titulo-perfil">Dados pessoais</h2>
                        <p className="descricao-modal-perfil">Atualize suas informações e seu espaço de estudos.</p>

                        {erroPerfil && <NotificacaoTemporaria mensagem={erroPerfil} tipo="erro" />}

                        <form className="formulario-perfil" onSubmit={(evento) => void salvarPerfil(evento)}>
                            <label htmlFor="perfil-nome">Nome completo</label>
                            <input id="perfil-nome" autoComplete="name" value={perfil.nome} onChange={(evento) => atualizarCampo("nome", evento.target.value)} minLength={2} maxLength={100} required />

                            <label htmlFor="perfil-email">E-mail</label>
                            <input id="perfil-email" type="email" autoComplete="email" value={perfil.email} onChange={(evento) => atualizarCampo("email", evento.target.value)} maxLength={190} required />

                            <label htmlFor="perfil-nivel">Nível de estudo</label>
                            <select id="perfil-nivel" value={perfil.nivelEstudo} onChange={(evento) => atualizarCampo("nivelEstudo", evento.target.value)} required>
                                <option value="fundamental">Ensino fundamental</option>
                                <option value="medio">Ensino médio</option>
                                <option value="tecnico">Ensino técnico</option>
                                <option value="superior">Ensino superior</option>
                                <option value="outro">Outro</option>
                            </select>

                            <label htmlFor="perfil-instituicao">Onde você estuda?</label>
                            <input id="perfil-instituicao" value={perfil.instituicao} onChange={(evento) => atualizarCampo("instituicao", evento.target.value)} minLength={2} maxLength={160} required />

                            <label htmlFor="perfil-curso">Curso, série ou ano</label>
                            <input id="perfil-curso" value={perfil.cursoSerie} onChange={(evento) => atualizarCampo("cursoSerie", evento.target.value)} minLength={2} maxLength={120} required />

                            <label htmlFor="perfil-cidade">Cidade <span>(opcional)</span></label>
                            <input id="perfil-cidade" autoComplete="address-level2" value={perfil.cidade} onChange={(evento) => atualizarCampo("cidade", evento.target.value)} maxLength={120} />

                            <div className="acoes-modal-perfil">
                                <button type="button" className="botao-secundario" onClick={() => setMostrarPerfil(false)}>Cancelar</button>
                                <button type="submit" className="botao-salvar" disabled={salvandoPerfil}>{salvandoPerfil ? "Salvando..." : "Salvar alterações"}</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
            {mostrarSenha && (
                <div className="fundo-modal-perfil" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setMostrarSenha(false); }}>
                    <section className="modal-perfil modal-alterar-senha" role="dialog" aria-modal="true" aria-labelledby="titulo-alterar-senha">
                        <button type="button" className="fechar-modal-perfil" onClick={() => setMostrarSenha(false)} aria-label="Fechar alteração de senha">×</button>
                        <p className="sobretitulo">SEGURANÇA DA CONTA</p>
                        <h2 id="titulo-alterar-senha">Alterar senha</h2>
                        <p className="descricao-modal-perfil">Confirme sua senha atual para cadastrar uma nova.</p>
                        {erroSenha && <NotificacaoTemporaria mensagem={erroSenha} tipo="erro" />}
                        <form className="formulario-perfil" onSubmit={(evento) => void salvarSenha(evento)}>
                            <label htmlFor="senha-atual-conta">Senha atual</label>
                            <input id="senha-atual-conta" type="password" autoComplete="current-password" value={senhaAtual} onChange={(evento) => setSenhaAtual(evento.target.value)} maxLength={128} required />
                            <label htmlFor="nova-senha-conta">Nova senha</label>
                            <input id="nova-senha-conta" type="password" autoComplete="new-password" value={novaSenha} onChange={(evento) => setNovaSenha(evento.target.value)} minLength={10} maxLength={128} required />
                            <label htmlFor="confirmar-nova-senha-conta">Confirme a nova senha</label>
                            <input id="confirmar-nova-senha-conta" type="password" autoComplete="new-password" value={confirmarSenha} onChange={(evento) => setConfirmarSenha(evento.target.value)} minLength={10} maxLength={128} required />
                            <div className="acoes-modal-perfil">
                                <button type="button" className="botao-secundario" onClick={() => setMostrarSenha(false)}>Cancelar</button>
                                <button type="submit" className="botao-salvar" disabled={salvandoSenha}>{salvandoSenha ? "Salvando..." : "Atualizar senha"}</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}

export default VisaoGeral;
