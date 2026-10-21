
import { useEffect, useState } from "react";
import {
    listarTarefas,
    criarTarefa,
    editarTarefa,
    concluirTarefa,
    reabrirTarefa as reabrirTarefaApi,
    excluirTarefa,
    type Tarefa,
    type DadosNovaTarefa
} from "../services/tarefas";
import {
    listarDisciplinas,
    type Disciplina
} from "../services/disciplinas";

type FiltroTarefa =
    | "todas"
    | "pendente"
    | "concluida";

function MinhasTarefas() {
    const [tarefas, setTarefas] = useState<Tarefa[]>([]);
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [filtro, setFiltro] = useState<FiltroTarefa>("todas");
    const [tarefaSelecionada, setTarefaSelecionada] =
        useState<Tarefa | null>(null);
    const [modoEdicao, setModoEdicao] = useState(false);

    const [formulario, setFormulario] = useState<DadosNovaTarefa>({
        disciplinaId: "",
        titulo: "",
        descricao: "",
        dataPrazo: "",
        dificuldade: 3,
        duracaoEstimada: 60,
        pesoAvaliacao: 0
    });

    async function carregarDados() {
        setCarregando(true);
        setErro("");

        try {
            const [tarefasCarregadas, disciplinasCarregadas] =
                await Promise.all([
                    listarTarefas(),
                    listarDisciplinas()
                ]);

            setTarefas(tarefasCarregadas);
            setDisciplinas(disciplinasCarregadas);

            setTarefaSelecionada((selecionada) => {
                if (!selecionada) {
                    return null;
                }

                return (
                    tarefasCarregadas.find(
                        (tarefa) => tarefa.id === selecionada.id
                    ) ?? null
                );
            });
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível carregar os dados."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarDados();
    }, []);

    useEffect(() => {
        if (!sucesso) {
            return;
        }

        const temporizador = window.setTimeout(() => {
            setSucesso("");
        }, 4000);

        return () => window.clearTimeout(temporizador);
    }, [sucesso]);

    function formularioVazio(): DadosNovaTarefa {
        return {
            disciplinaId: "",
            titulo: "",
            descricao: "",
            dataPrazo: "",
            dificuldade: 3,
            duracaoEstimada: 60,
            pesoAvaliacao: 0
        };
    }

    function atualizarCampo(
        campo: keyof DadosNovaTarefa,
        valor: string | number
    ) {
        setFormulario((anterior) => ({
            ...anterior,
            [campo]: valor
        }));
    }

    function abrirCadastro() {
        setFormulario(formularioVazio());
        setTarefaSelecionada(null);
        setModoEdicao(false);
        setMostrarFormulario(true);
        setErro("");
        setSucesso("");
    }

    function abrirEdicao(tarefa: Tarefa) {
        setFormulario({
            disciplinaId: tarefa.disciplinaId,
            titulo: tarefa.titulo,
            descricao: tarefa.descricao,
            dataPrazo: tarefa.dataPrazo.slice(0, 10),
            dificuldade: tarefa.dificuldade,
            duracaoEstimada: tarefa.duracaoEstimada,
            pesoAvaliacao: tarefa.pesoAvaliacao
        });

        setTarefaSelecionada(tarefa);
        setModoEdicao(true);
        setMostrarFormulario(true);
        setErro("");
        setSucesso("");
    }

    function cancelarFormulario() {
        setMostrarFormulario(false);
        setModoEdicao(false);
        setErro("");
    }

    async function salvarTarefa(
        evento: React.FormEvent<HTMLFormElement>
    ) {
        evento.preventDefault();
        setErro("");
        setSucesso("");

        if (!formulario.disciplinaId) {
            setErro("Selecione uma disciplina.");
            return;
        }

        setSalvando(true);

        try {
            if (modoEdicao && tarefaSelecionada) {
                await editarTarefa(tarefaSelecionada.id, formulario);
            } else {
                await criarTarefa(formulario);
                setFiltro("todas");
            }

            setMostrarFormulario(false);
            setModoEdicao(false);
            await carregarDados();
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível salvar a tarefa."
            );
        } finally {
            setSalvando(false);
        }
    }

    async function marcarComoConcluida(tarefa: Tarefa) {
        if (tarefa.estado === "concluida") {
            return;
        }

        setErro("");
        setSucesso("");

        try {
            await concluirTarefa(tarefa.id);
            await carregarDados();
            setSucesso("Tarefa concluída com sucesso!");
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível concluir a tarefa."
            );
        }
    }

    async function reabrirTarefa(tarefa: Tarefa) {
        setErro("");
        setSucesso("");

        try {
            await reabrirTarefaApi(tarefa.id);
            setTarefaSelecionada(null);
            setFiltro("pendente");
            await carregarDados();
            setSucesso("Tarefa reaberta com sucesso!");
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível reabrir a tarefa."
            );
        }
    }

    async function removerTarefa(tarefa: Tarefa) {
        setErro("");
        setSucesso("");

        try {
            await excluirTarefa(tarefa.id);
            setTarefaSelecionada(null);
            setMostrarFormulario(false);
            setModoEdicao(false);
            await carregarDados();
            setSucesso("Tarefa excluída com sucesso!");
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível excluir a tarefa."
            );
        }
    }

    const tarefasFiltradas = tarefas.filter((tarefa) => {
        return filtro === "todas" || tarefa.estado === filtro;
    });

    function nomeDisciplina(disciplinaId: string): string {
        return (
            disciplinas.find(
                (disciplina) => disciplina.id === disciplinaId
            )?.nome ?? "Disciplina não encontrada"
        );
    }

    function formatarPrazo(data: string): string {
        const apenasData = data.slice(0, 10);
        const partes = apenasData.split("-");

        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        return new Date(data).toLocaleDateString("pt-BR");
    }

    function nomeEstado(estado: Tarefa["estado"]): string {
        switch (estado) {
            case "pendente":
                return "Pendente";
            case "concluida":
                return "Concluída";
        }
    }

    function iconeTarefa(tarefa: Tarefa): string {
        const texto = `${tarefa.titulo} ${tarefa.descricao}`.toLowerCase();

        if (
            texto.includes("prova") ||
            texto.includes("avaliação") ||
            texto.includes("exame")
        ) {
            return "▤";
        }

        if (
            texto.includes("programação") ||
            texto.includes("código") ||
            texto.includes("algoritmo")
        ) {
            return "</>";
        }

        if (
            texto.includes("leitura") ||
            texto.includes("ler capítulo") ||
            texto.includes("resumo")
        ) {
            return "▥";
        }

        if (
            texto.includes("lista") ||
            texto.includes("exercício") ||
            texto.includes("atividade")
        ) {
            return "☷";
        }

        return "▤";
    }

    const quantidadePendentes = tarefas.filter(
        (tarefa) => tarefa.estado === "pendente"
    ).length;

    const quantidadeConcluidas = tarefas.filter(
        (tarefa) => tarefa.estado === "concluida"
    ).length;
    const progressoConclusao = tarefas.length === 0
        ? 0
        : Math.round((quantidadeConcluidas / tarefas.length) * 100);

    return (
        <section className="secao-disciplinas">
            <header className="cabecalho">
                <div>
                    <p className="sobretitulo">ORGANIZE SUA ROTINA</p>
                    <h1>
                        Minhas tarefas <span>✦</span>
                    </h1>
                    <p className="subtitulo">
                        Todas as suas atividades em um só lugar.
                    </p>
                </div>

            </header>

            <div className="resumo-tarefas resumo-progresso cartao-resumo">
                <div>
                    <strong>Seu progresso</strong>
                    <small>
                        {quantidadeConcluidas} de {tarefas.length}{" "}
                        {tarefas.length === 1 ? "tarefa concluída" : "tarefas concluídas"}
                    </small>
                </div>

                <span
                    className="barra-progresso-tarefas"
                    role="progressbar"
                    aria-label="Progresso de conclusão das tarefas"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressoConclusao}
                >
                    <span style={{ width: `${progressoConclusao}%` }} />
                </span>

                <span className="contador-tarefas">
                    {progressoConclusao}%
                </span>
            </div>

            <div className="resumo-estados">
                <button
                    type="button"
                    className="mini-resumo"
                    onClick={() => setFiltro("pendente")}
                >
                    <span className="mini-resumo-icone pendente">◷</span>
                    <span>
                        <strong>{quantidadePendentes}</strong>
                        <small>Pendentes</small>
                    </span>
                </button>

                <button
                    type="button"
                    className="mini-resumo"
                    onClick={() => setFiltro("concluida")}
                >
                    <span className="mini-resumo-icone concluida">✓</span>
                    <span>
                        <strong>{quantidadeConcluidas}</strong>
                        <small>Concluídas</small>
                    </span>
                </button>
            </div>

            {mostrarFormulario && (
                <form
                    className="formulario-disciplina"
                    onSubmit={salvarTarefa}
                >
                    <h3>
                        {modoEdicao ? "Editar tarefa" : "Nova tarefa"}
                    </h3>

                    <p>
                        {modoEdicao
                            ? "Altere os dados da atividade."
                            : "Preencha os dados da atividade que deseja cadastrar."}
                    </p>

                    <label htmlFor="titulo">Título da tarefa</label>
                    <input
                        id="titulo"
                        type="text"
                        value={formulario.titulo}
                        onChange={(evento) =>
                            atualizarCampo("titulo", evento.target.value)
                        }
                        placeholder="Ex.: Lista de exercícios"
                        required
                    />

                    <label htmlFor="descricao">Descrição</label>
                    <textarea
                        id="descricao"
                        value={formulario.descricao}
                        onChange={(evento) =>
                            atualizarCampo("descricao", evento.target.value)
                        }
                        placeholder="Descreva o que precisa ser feito..."
                        rows={3}
                    />

                    <label htmlFor="disciplina">Disciplina</label>
                    <select
                        id="disciplina"
                        value={formulario.disciplinaId}
                        onChange={(evento) =>
                            atualizarCampo(
                                "disciplinaId",
                                evento.target.value
                            )
                        }
                        required
                    >
                        <option value="">Selecione uma disciplina</option>
                        {disciplinas.map((disciplina) => (
                            <option
                                key={disciplina.id}
                                value={disciplina.id}
                            >
                                {disciplina.nome}
                            </option>
                        ))}
                    </select>

                    {disciplinas.length === 0 && (
                        <small>
                            Cadastre uma disciplina na página Disciplinas
                            antes de criar uma tarefa.
                        </small>
                    )}

                    <label htmlFor="dataPrazo">Prazo</label>
                    <input
                        id="dataPrazo"
                        type="date"
                        value={formulario.dataPrazo}
                        onChange={(evento) =>
                            atualizarCampo("dataPrazo", evento.target.value)
                        }
                        required
                    />

                    <label htmlFor="dificuldade">
                        Dificuldade: {formulario.dificuldade}/5
                    </label>
                    <select
                        id="dificuldade"
                        value={formulario.dificuldade}
                        onChange={(evento) =>
                            atualizarCampo(
                                "dificuldade",
                                Number(evento.target.value)
                            )
                        }
                    >
                        <option value={1}>1 — Muito fácil</option>
                        <option value={2}>2 — Fácil</option>
                        <option value={3}>3 — Média</option>
                        <option value={4}>4 — Difícil</option>
                        <option value={5}>5 — Muito difícil</option>
                    </select>

                    <label htmlFor="duracao">
                        Duração estimada (minutos)
                    </label>
                    <input
                        id="duracao"
                        type="number"
                        min={1}
                        value={formulario.duracaoEstimada}
                        onChange={(evento) =>
                            atualizarCampo(
                                "duracaoEstimada",
                                Number(evento.target.value)
                            )
                        }
                        required
                    />

                    <label htmlFor="peso">
                        Peso da avaliação (%)
                    </label>
                    <input
                        id="peso"
                        type="number"
                        min={0}
                        max={100}
                        value={formulario.pesoAvaliacao}
                        onChange={(evento) =>
                            atualizarCampo(
                                "pesoAvaliacao",
                                Number(evento.target.value)
                            )
                        }
                        required
                    />

                    {erro && <p className="mensagem-erro">{erro}</p>}

                    <div className="botoes-formulario">
                        <button
                            className="botao-salvar"
                            type="submit"
                            disabled={salvando || disciplinas.length === 0}
                        >
                            {salvando
                                ? "Salvando..."
                                : modoEdicao
                                  ? "Salvar alterações"
                                  : "Cadastrar tarefa"}
                        </button>

                        <button
                            className="botao-secundario"
                            type="button"
                            onClick={cancelarFormulario}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {sucesso && (
                <p className="aviso-conclusao" role="status" aria-live="polite">
                    {sucesso}
                </p>
            )}

            {erro && !mostrarFormulario && (
                <p className="mensagem-erro">{erro}</p>
            )}

            <div className="titulo-secao secao-lista-tarefas">
                <div>
                    <h2>Suas atividades</h2>
                    <p>Selecione uma tarefa para consultar os detalhes.</p>
                </div>
            </div>

            <div className="filtros-tarefas">
                {(
                    [
                        ["pendente", "Pendentes"],
                        ["concluida", "Concluídas"],
                        ["todas", "Todas"]
                    ] as [FiltroTarefa, string][]
                ).map(([valor, rotulo]) => (
                    <button
                        key={valor}
                        type="button"
                        className={`filtro-tarefa ${
                            filtro === valor ? "ativo" : ""
                        }`}
                        onClick={() => setFiltro(valor)}
                    >
                        {rotulo}
                    </button>
                ))}

                <button
                    className="botao-salvar botao-nova-tarefa-filtros"
                    type="button"
                    onClick={abrirCadastro}
                >
                    + Nova tarefa
                </button>
            </div>

            {carregando && (
                <p className="mensagem-vazia">Carregando tarefas...</p>
            )}

            {!carregando && tarefasFiltradas.length === 0 && (
                <div className="mensagem-vazia">
                    <p>
                        {tarefas.length === 0
                            ? "Você ainda não tem tarefas cadastradas."
                            : "Nenhuma tarefa encontrada neste filtro."}
                    </p>
                    <small>
                        {tarefas.length === 0
                            ? "Clique em “Nova tarefa” para adicionar sua primeira atividade."
                            : "Escolha outro filtro para visualizar suas atividades."}
                    </small>
                </div>
            )}

            
            {!carregando && tarefasFiltradas.length > 0 && (
                <div className="lista-disciplinas">
                    {tarefasFiltradas.map((tarefa) => (
                    <article
                        className={`cartao-tarefa-lista ${
                            tarefaSelecionada?.id === tarefa.id ? "selecionado" : ""
                        }`}
                        key={tarefa.id}
                    >
                        <span
                            className={`estado-tarefa estado-${tarefa.estado.replace(
                                " ",
                                "-"
                            )}`}
                        >
                            {nomeEstado(tarefa.estado)}
                        </span>

                        <div className="cartao-tarefa-linha">
                            <button
                                className="cartao-tarefa-interativo"
                                type="button"
                                onClick={() => {
                                    setTarefaSelecionada((anterior) =>
                                        anterior?.id === tarefa.id ? null : tarefa
                                    );
                                    setMostrarFormulario(false);
                                    setModoEdicao(false);
                                }}
                            >
                                <span className="icone-tarefa">
                                    {iconeTarefa(tarefa)}
                                </span>

                                <span className="conteudo-cartao-tarefa">
                                    <strong>{tarefa.titulo}</strong>
                                    <small>{nomeDisciplina(tarefa.disciplinaId)}</small>
                                    <small>Prazo: {formatarPrazo(tarefa.dataPrazo)}</small>
                                </span>
                            </button>

                            <div className="acoes-status-tarefa">
                                {tarefa.estado !== "concluida" ? (
                                    <button
                                        type="button"
                                        className="icone-acao-tarefa concluir"
                                        title="Concluir tarefa"
                                        aria-label={`Concluir ${tarefa.titulo}`}
                                        onClick={() => marcarComoConcluida(tarefa)}
                                    >
                                        ✓
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="icone-acao-tarefa reabrir"
                                        title="Reabrir tarefa"
                                        aria-label={`Reabrir ${tarefa.titulo}`}
                                        onClick={() => reabrirTarefa(tarefa)}
                                    >
                                        ↶
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="icone-acao-tarefa excluir"
                                    title="Excluir tarefa"
                                    aria-label={`Excluir ${tarefa.titulo}`}
                                    onClick={() => removerTarefa(tarefa)}
                                >
                                    ×
                                </button>

                                <button
                                    type="button"
                                    className="seta-tarefa"
                                    aria-label={`Ver detalhes de ${tarefa.titulo}`}
                                    onClick={() => {
                                        setTarefaSelecionada(tarefa);
                                        setMostrarFormulario(false);
                                        setModoEdicao(false);
                                    }}
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </article>
                    ))}
                </div>
            )}


            {tarefaSelecionada && !mostrarFormulario && (
                <div
                    className="sobreposicao-detalhes"
                    onClick={() => setTarefaSelecionada(null)}
                >
                    <section
                        className="painel-detalhes-tarefa"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-detalhes-tarefa"
                        onClick={(evento) => evento.stopPropagation()}
                    >
                        <div className="cabecalho-detalhes-tarefa">
                            <div>
                                <p className="sobretitulo">
                                    DETALHES DA ATIVIDADE
                                </p>
                                <h2 id="titulo-detalhes-tarefa">
                                    {tarefaSelecionada.titulo}
                                </h2>
                            </div>

                            <button
                                className="botao-fechar-detalhes"
                                type="button"
                                onClick={() => setTarefaSelecionada(null)}
                                aria-label="Fechar detalhes"
                            >
                                ×
                            </button>
                        </div>

                        <div className="detalhes-disciplina">
                            <span className="icone-tarefa">
                                {iconeTarefa(tarefaSelecionada)}
                            </span>
                            <div>
                                <small>Disciplina</small>
                                <strong>
                                    {nomeDisciplina(
                                        tarefaSelecionada.disciplinaId
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div className="descricao-completa">
                            <h3>Descrição</h3>
                            <p>
                                {tarefaSelecionada.descricao ||
                                    "Nenhuma descrição foi adicionada a esta tarefa."}
                            </p>
                        </div>

                        <div className="grade-detalhes-tarefa">
                            <div>
                                <small>Prazo</small>
                                <strong>
                                    {formatarPrazo(
                                        tarefaSelecionada.dataPrazo
                                    )}
                                </strong>
                            </div>
                            <div>
                                <small>Estado</small>
                                <strong>
                                    {nomeEstado(tarefaSelecionada.estado)}
                                </strong>
                            </div>
                            <div>
                                <small>Dificuldade</small>
                                <strong>
                                    {tarefaSelecionada.dificuldade}/5
                                </strong>
                            </div>
                            <div>
                                <small>Duração estimada</small>
                                <strong>
                                    {tarefaSelecionada.duracaoEstimada} minutos
                                </strong>
                            </div>
                            <div>
                                <small>Tempo estudado</small>
                                <strong>
                                    {tarefaSelecionada.tempoEstudado} minutos
                                </strong>
                            </div>
                            <div>
                                <small>Peso da avaliação</small>
                                <strong>
                                    {tarefaSelecionada.pesoAvaliacao}%
                                </strong>
                            </div>
                        </div>

                        <div className="acoes-tarefa">
                            <button
                                type="button"
                                className="botao-acao-tarefa editar"
                                onClick={() =>
                                    abrirEdicao(tarefaSelecionada)
                                }
                            >
                                ✎ Editar
                            </button>

                            {tarefaSelecionada.estado !== "concluida" ? (
                                <button
                                    type="button"
                                    className="botao-acao-tarefa concluir"
                                    onClick={() =>
                                        marcarComoConcluida(tarefaSelecionada)
                                    }
                                >
                                    ✓ Concluir tarefa
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="botao-acao-tarefa reabrir"
                                    onClick={() => reabrirTarefa(tarefaSelecionada)}
                                >
                                    ↶ Reabrir tarefa
                                </button>
                            )}

                            <button
                                type="button"
                                className="botao-acao-tarefa excluir"
                                onClick={() =>
                                    removerTarefa(tarefaSelecionada)
                                }
                            >
                                × Excluir
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}

export default MinhasTarefas;
