import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAutenticacao } from "../contexto/AutenticacaoContexto";
import { cadastrar, entrar } from "../services/autenticacao";
import NotificacaoTemporaria from "../components/notificacao-temporaria";

const NIVEIS = [
    ["fundamental", "Ensino fundamental"],
    ["medio", "Ensino médio"],
    ["tecnico", "Ensino técnico"],
    ["superior", "Ensino superior"],
    ["outro", "Outro"]
];

export default function Autenticacao({ modo }: { modo: "login" | "cadastro" }) {
    const cadastro = modo === "cadastro";
    const { usuario, definirUsuario } = useAutenticacao();
    const navegar = useNavigate();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [nivelEstudo, setNivelEstudo] = useState("medio");
    const [instituicao, setInstituicao] = useState("");
    const [cursoSerie, setCursoSerie] = useState("");
    const [cidade, setCidade] = useState("");
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        // Login e cadastro são fluxos separados: não reaproveita os dados digitados.
        setNome("");
        setEmail("");
        setSenha("");
        setConfirmarSenha("");
        setNivelEstudo("medio");
        setInstituicao("");
        setCursoSerie("");
        setCidade("");
        setErro("");
    }, [modo]);

    if (usuario) return <Navigate to="/inicio" replace />;

    async function enviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setErro("");
        if (cadastro && senha !== confirmarSenha) {
            setErro("As senhas não coincidem.");
            return;
        }
        setEnviando(true);
        try {
            const sessao = cadastro
                ? await cadastrar({ nome, email, senha, nivelEstudo, instituicao, cursoSerie, cidade })
                : await entrar(email, senha);
            definirUsuario(sessao);
            navegar("/inicio", { replace: true });
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível concluir o acesso.");
        } finally {
            setEnviando(false);
        }
    }

    return (
        <main className="pagina-autenticacao">
            <section className="cartao-autenticacao">
                <header className="cabecalho-autenticacao">
                    <img src="/logo-studyflow.png" alt="" />
                    <span>StudyFlow</span>
                </header>
                <p className="sobretitulo">SUA ROTINA DE ESTUDOS, NO SEU RITMO</p>
                <h1>{cadastro ? "Crie sua conta" : "Boas-vindas de volta"}</h1>
                <p className="descricao-autenticacao">
                    {cadastro
                        ? "Conte um pouco sobre seus estudos para personalizarmos seu espaço."
                        : "Entre para continuar organizando suas tarefas e seus estudos."}
                </p>

                {erro && <NotificacaoTemporaria mensagem={erro} tipo="erro" />}

                <form className="formulario-autenticacao" autoComplete={cadastro ? "off" : "on"} onSubmit={(evento) => void enviar(evento)}>
                    {cadastro && (
                        <>
                            <label htmlFor="nome-conta">Seu nome</label>
                            <input id="nome-conta" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={100} required />
                        </>
                    )}
                    <label htmlFor={cadastro ? "email-cadastro" : "email-login"}>E-mail</label>
                    <input
                        id={cadastro ? "email-cadastro" : "email-login"}
                        name={cadastro ? "email-nova-conta" : "email-login"}
                        type="email"
                        autoComplete={cadastro ? "off" : "email"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label htmlFor="senha-conta">Senha</label>
                    <input id="senha-conta" type="password" autoComplete={cadastro ? "new-password" : "current-password"} value={senha} onChange={(e) => setSenha(e.target.value)} minLength={10} maxLength={128} required />

                    {cadastro && (
                        <>
                            <label htmlFor="confirmar-senha">Confirme sua senha</label>
                            <input id="confirmar-senha" type="password" autoComplete="new-password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} minLength={10} maxLength={128} required />

                            <div className="divisor-formulario"><span>Sobre seus estudos</span></div>

                            <label htmlFor="nivel-estudo">Nível de estudo</label>
                            <select id="nivel-estudo" value={nivelEstudo} onChange={(e) => setNivelEstudo(e.target.value)} required>
                                {NIVEIS.map(([valor, rotulo]) => <option value={valor} key={valor}>{rotulo}</option>)}
                            </select>

                            <label htmlFor="instituicao-estudo">Onde você estuda?</label>
                            <input id="instituicao-estudo" value={instituicao} onChange={(e) => setInstituicao(e.target.value)} placeholder="Nome da escola, faculdade ou instituição" minLength={2} maxLength={160} required />

                            <label htmlFor="curso-serie">Curso, série ou ano</label>
                            <input id="curso-serie" value={cursoSerie} onChange={(e) => setCursoSerie(e.target.value)} placeholder="Ex.: 2º ano, Engenharia, Técnico em..." minLength={2} maxLength={120} required />

                            <label htmlFor="cidade-estudo">Cidade <span>(opcional)</span></label>
                            <input id="cidade-estudo" autoComplete="address-level2" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Sua cidade" maxLength={120} />
                        </>
                    )}

                    <button className="botao-salvar botao-enviar-autenticacao" type="submit" disabled={enviando}>
                        {enviando ? "Aguarde..." : cadastro ? "Criar minha conta" : "Entrar"}
                    </button>
                </form>

                <p className="alternar-autenticacao">
                    {cadastro ? "Já tem uma conta? " : "Ainda não tem uma conta? "}
                    <Link to={cadastro ? "/login" : "/cadastro"}>{cadastro ? "Entrar" : "Criar conta"}</Link>
                </p>
            </section>
        </main>
    );
}
