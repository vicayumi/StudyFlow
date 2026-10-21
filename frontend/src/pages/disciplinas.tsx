
import { useEffect, useState } from "react";
import {
    listarDisciplinas,
    criarDisciplina,
    atualizarDisciplina,
    excluirDisciplina,
    type Disciplina
} from "../services/disciplinas";

function Disciplinas() {
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [formularioAberto, setFormularioAberto] = useState(false);
    const [disciplinaEditando, setDisciplinaEditando] =
        useState<Disciplina | null>(null);
    const [nome, setNome] = useState("");
    const [cor, setCor] = useState("#8B5CF6");
    const [salvando, setSalvando] = useState(false);
    const [erroFormulario, setErroFormulario] = useState("");
    const [excluindoId, setExcluindoId] = useState<string | null>(null);

    useEffect(() => {
        async function carregar() {
            try {
                setDisciplinas(await listarDisciplinas());
            } catch {
                setErro("Não foi possível carregar as disciplinas. Confira se a API está rodando.");
            } finally {
                setCarregando(false);
            }
        }

        void carregar();
    }, []);

    function abrirCadastro() {
        setDisciplinaEditando(null);
        setNome("");
        setCor("#8B5CF6");
        setErroFormulario("");
        setFormularioAberto(true);
    }

    function abrirEdicao(disciplina: Disciplina) {
        setDisciplinaEditando(disciplina);
        setNome(disciplina.nome);
        setCor(disciplina.cor);
        setErroFormulario("");
        setFormularioAberto(true);
    }

    async function salvar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setSalvando(true);
        setErroFormulario("");

        try {
            if (disciplinaEditando) {
                const atualizada = await atualizarDisciplina(
                    disciplinaEditando.id,
                    { nome: nome.trim(), cor }
                );

                setDisciplinas((atuais) =>
                    atuais
                        .map((item) => item.id === atualizada.id ? atualizada : item)
                        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                );
            } else {
                const nova = await criarDisciplina(nome.trim(), cor);

                setDisciplinas((atuais) =>
                    [...atuais, nova].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                );
            }

            setFormularioAberto(false);
            setDisciplinaEditando(null);
            setNome("");
            setCor("#8B5CF6");
        } catch (erro) {
            setErroFormulario(
                erro instanceof Error ? erro.message : "Não foi possível salvar a disciplina."
            );
        } finally {
            setSalvando(false);
        }
    }

    async function remover(disciplina: Disciplina) {
        if (!window.confirm(`Deseja excluir a disciplina "${disciplina.nome}"?`)) {
            return;
        }

        setExcluindoId(disciplina.id);

        try {
            await excluirDisciplina(disciplina.id);
            setDisciplinas((atuais) =>
                atuais.filter((item) => item.id !== disciplina.id)
            );
        } catch (erro) {
            window.alert(
                erro instanceof Error ? erro.message : "Não foi possível excluir a disciplina."
            );
        } finally {
            setExcluindoId(null);
        }
    }

    return (
        <>
            <header className="cabecalho">
                <div>
                    <p className="sobretitulo">SUAS MATÉRIAS</p>
                    <h1>Disciplinas <span>✦</span></h1>
                    <p className="subtitulo">
                        Gerencie suas matérias e organize seus estudos.
                    </p>
                </div>

                <button className="botao-secundario" onClick={abrirCadastro}>
                    + Nova disciplina
                </button>
            </header>

            <section className="secao-disciplinas">
                <div className="titulo-secao">
                    <div>
                        <h2>Minhas disciplinas</h2>
                        <p>{disciplinas.length} cadastrada(s)</p>
                    </div>
                </div>

                {formularioAberto && (
                    <form className="formulario-disciplina" onSubmit={salvar}>
                        <h3>{disciplinaEditando ? "Editar disciplina" : "Nova disciplina"}</h3>

                        <label htmlFor="nome-disciplina">Nome</label>
                        <input
                            id="nome-disciplina"
                            type="text"
                            value={nome}
                            onChange={(evento) => setNome(evento.target.value)}
                            maxLength={100}
                            placeholder="Ex.: Cálculo"
                            required
                        />

                        <label htmlFor="cor-disciplina">Cor</label>
                        <div className="seletor-cor">
                            <input
                                id="cor-disciplina"
                                type="color"
                                value={cor}
                                onChange={(evento) => setCor(evento.target.value)}
                            />
                            <span>{cor.toUpperCase()}</span>
                        </div>

                        {erroFormulario && (
                            <p className="mensagem-erro">{erroFormulario}</p>
                        )}

                        <div className="botoes-formulario">
                            <button
                                type="button"
                                className="botao-cancelar"
                                onClick={() => setFormularioAberto(false)}
                            >
                                Cancelar
                            </button>
                            <button className="botao-salvar" type="submit" disabled={salvando}>
                                {salvando ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </form>
                )}

                {carregando && <p>Carregando disciplinas...</p>}
                {!carregando && erro && <p className="mensagem-erro">{erro}</p>}

                {!carregando && !erro && disciplinas.length === 0 && (
                    <p className="mensagem-vazia">
                        Você ainda não tem disciplinas. Cadastre a primeira!
                    </p>
                )}

                <div className="lista-disciplinas">
                    {!carregando && !erro && disciplinas.map((disciplina) => (
                        <article className="item-disciplina" key={disciplina.id}>
                            <div
                                className="icone-disciplina"
                                style={{ backgroundColor: disciplina.cor }}
                            >
                                ✦
                            </div>

                            <div className="info-disciplina">
                                <strong>{disciplina.nome}</strong>
                                <span>Disciplina cadastrada no StudyFlow</span>
                            </div>

                            <div className="acoes-disciplina">
                                <button
                                    type="button"
                                    className="botao-acao editar"
                                    onClick={() => abrirEdicao(disciplina)}
                                    title="Editar disciplina"
                                    aria-label={`Editar ${disciplina.nome}`}
                                >
                                    ✎
                                </button>
                                <button
                                    type="button"
                                    className="botao-acao excluir"
                                    onClick={() => void remover(disciplina)}
                                    disabled={excluindoId === disciplina.id}
                                    title="Excluir disciplina"
                                    aria-label={`Excluir ${disciplina.nome}`}
                                >
                                    {excluindoId === disciplina.id ? "…" : "×"}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}

export default Disciplinas;
