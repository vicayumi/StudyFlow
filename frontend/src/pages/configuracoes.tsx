import { useEffect, useState, type FormEvent } from "react";
import { useAutenticacao } from "../contexto/AutenticacaoContexto";
import { alterarSenha, atualizarPerfil, type DadosPerfil } from "../services/autenticacao";

const PERFIL_VAZIO: DadosPerfil = {
    nome: "",
    email: "",
    nivelEstudo: "medio",
    instituicao: "",
    cursoSerie: "",
    cidade: ""
};

export default function Configuracoes() {
    const { usuario, definirUsuario } = useAutenticacao();
    const [perfil, setPerfil] = useState<DadosPerfil>(PERFIL_VAZIO);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [tema, setTema] = useState<"claro" | "escuro">(() =>
        localStorage.getItem("studyflow_tema") === "escuro" ? "escuro" : "claro"
    );
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [erroSenha, setErroSenha] = useState("");
    const [sucessoSenha, setSucessoSenha] = useState("");
    const [salvandoSenha, setSalvandoSenha] = useState(false);

    useEffect(() => {
        document.documentElement.dataset.theme = tema;
        localStorage.setItem("studyflow_tema", tema);
    }, [tema]);

    useEffect(() => {
        if (!usuario) return;
        setPerfil({
            nome: usuario.nome,
            email: usuario.email,
            nivelEstudo: usuario.nivelEstudo,
            instituicao: usuario.instituicao,
            cursoSerie: usuario.cursoSerie,
            cidade: usuario.cidade ?? ""
        });
    }, [usuario]);

    function atualizarCampo<K extends keyof DadosPerfil>(campo: K, valor: DadosPerfil[K]) {
        setPerfil((atual) => ({ ...atual, [campo]: valor }));
        setSucesso("");
    }

    async function salvar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setErro("");
        setSucesso("");
        setSalvando(true);
        try {
            const atualizado = await atualizarPerfil(perfil);
            definirUsuario(atualizado);
            setSucesso("Seus dados foram atualizados com sucesso.");
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar seus dados.");
        } finally {
            setSalvando(false);
        }
    }

    async function salvarSenha(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setErroSenha("");
        setSucessoSenha("");
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
            setSucessoSenha("Sua senha foi alterada com sucesso.");
        } catch (falha) {
            setErroSenha(falha instanceof Error ? falha.message : "Não foi possível alterar sua senha.");
        } finally {
            setSalvandoSenha(false);
        }
    }

    return (
        <section className="secao-disciplinas pagina-configuracoes">
            <header className="cabecalho">
                <div>
                    <p className="sobretitulo">PREFERÊNCIAS DA CONTA</p>
                    <h1>Configurações</h1>
                    <p className="subtitulo">Personalize o StudyFlow e gerencie sua conta.</p>
                </div>
            </header>

            <section className="cartao-configuracoes">
                <div className="titulo-secao">
                    <div>
                        <h2>Aparência do site</h2>
                        <p>Escolha como você prefere visualizar o StudyFlow.</p>
                    </div>
                </div>
                <div className="opcoes-tema" role="group" aria-label="Tema do site">
                    <button type="button" className={tema === "claro" ? "tema-selecionado" : ""} aria-pressed={tema === "claro"} onClick={() => setTema("claro")}>
                        <span aria-hidden="true">☀</span> Claro
                    </button>
                    <button type="button" className={tema === "escuro" ? "tema-selecionado" : ""} aria-pressed={tema === "escuro"} onClick={() => setTema("escuro")}>
                        <span aria-hidden="true">☾</span> Escuro
                    </button>
                </div>
            </section>

            <section className="cartao-configuracoes">
                <div className="titulo-secao">
                    <div>
                        <h2>Dados pessoais</h2>
                        <p>Essas informações ajudam a personalizar seu espaço no StudyFlow.</p>
                    </div>
                </div>

                {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
                {sucesso && <p className="mensagem-sucesso" role="status">{sucesso}</p>}

                <form className="formulario-configuracoes" onSubmit={(evento) => void salvar(evento)}>
                    <div className="campos-configuracoes">
                        <label>
                            Nome completo
                            <input autoComplete="name" value={perfil.nome} onChange={(evento) => atualizarCampo("nome", evento.target.value)} minLength={2} maxLength={100} required />
                        </label>

                        <label>
                            E-mail
                            <input type="email" autoComplete="email" value={perfil.email} onChange={(evento) => atualizarCampo("email", evento.target.value)} maxLength={190} required />
                        </label>

                        <label>
                            Nível de estudo
                            <select value={perfil.nivelEstudo} onChange={(evento) => atualizarCampo("nivelEstudo", evento.target.value)} required>
                                <option value="fundamental">Ensino fundamental</option>
                                <option value="medio">Ensino médio</option>
                                <option value="tecnico">Ensino técnico</option>
                                <option value="superior">Ensino superior</option>
                                <option value="outro">Outro</option>
                            </select>
                        </label>

                        <label>
                            Onde você estuda?
                            <input value={perfil.instituicao} onChange={(evento) => atualizarCampo("instituicao", evento.target.value)} minLength={2} maxLength={160} required />
                        </label>

                        <label>
                            Curso, série ou ano
                            <input value={perfil.cursoSerie} onChange={(evento) => atualizarCampo("cursoSerie", evento.target.value)} minLength={2} maxLength={120} required />
                        </label>

                        <label>
                            Cidade <span>(opcional)</span>
                            <input autoComplete="address-level2" value={perfil.cidade} onChange={(evento) => atualizarCampo("cidade", evento.target.value)} maxLength={120} />
                        </label>
                    </div>

                    <button type="submit" className="botao-salvar" disabled={salvando}>
                        {salvando ? "Salvando..." : "Salvar alterações"}
                    </button>
                </form>
            </section>

            <section className="cartao-configuracoes">
                <div className="titulo-secao">
                    <div>
                        <h2>Alterar senha</h2>
                        <p>Use sua senha atual para definir uma nova senha de acesso.</p>
                    </div>
                </div>

                {erroSenha && <p className="mensagem-erro" role="alert">{erroSenha}</p>}
                {sucessoSenha && <p className="mensagem-sucesso" role="status">{sucessoSenha}</p>}

                <form className="formulario-configuracoes" onSubmit={(evento) => void salvarSenha(evento)}>
                    <div className="campos-configuracoes campos-senha">
                        <label>
                            Senha atual
                            <input type="password" autoComplete="current-password" value={senhaAtual} onChange={(evento) => setSenhaAtual(evento.target.value)} maxLength={128} required />
                        </label>
                        <label>
                            Nova senha
                            <input type="password" autoComplete="new-password" value={novaSenha} onChange={(evento) => setNovaSenha(evento.target.value)} minLength={10} maxLength={128} required />
                        </label>
                        <label>
                            Confirme a nova senha
                            <input type="password" autoComplete="new-password" value={confirmarSenha} onChange={(evento) => setConfirmarSenha(evento.target.value)} minLength={10} maxLength={128} required />
                        </label>
                    </div>
                    <button type="submit" className="botao-salvar" disabled={salvandoSenha}>
                        {salvandoSenha ? "Salvando..." : "Atualizar senha"}
                    </button>
                </form>
            </section>
        </section>
    );
}
