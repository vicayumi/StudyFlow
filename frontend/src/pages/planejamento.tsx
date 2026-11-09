import { useEffect, useState } from "react";
import {
    atualizarHorarioDisponivel,
    criarHorarioDisponivel,
    excluirHorarioDisponivel,
    gerarPlanoSemanal,
    buscarPlanoSemanal,
    listarEstrategiasPlanejamento,
    listarHorariosDisponiveis,
    listarSessoesCalendario,
    type DadosHorarioDisponivel,
    type EstrategiaPlanejamento,
    type HorarioDisponivel,
    type PlanoSemanal,
    type SessaoPlanejada
} from "../services/planejamento";
import { concluirSessaoPlanejada } from "../services/sessoes-estudo";
import NotificacaoTemporaria from "../components/notificacao-temporaria";

const DIAS_DA_SEMANA = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
];

function dataLocalAtual(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function Planejamento() {
    const [horarios, setHorarios] = useState<HorarioDisponivel[]>([]);
    const [carregandoHorarios, setCarregandoHorarios] = useState(true);
    const [salvandoHorario, setSalvandoHorario] = useState(false);
    const [horarioEditandoId, setHorarioEditandoId] = useState<string | null>(null);
    const [formulario, setFormulario] = useState<DadosHorarioDisponivel>({
        diaSemana: 1,
        horaInicio: "09:00",
        horaFim: "10:00"
    });
    const [dataInicio, setDataInicio] = useState(dataLocalAtual);
    const [gerandoPlano, setGerandoPlano] = useState(false);
    const [plano, setPlano] = useState<PlanoSemanal | null>(null);
    const [estrategias, setEstrategias] = useState<EstrategiaPlanejamento[]>([]);
    const [estrategiaSelecionada, setEstrategiaSelecionada] = useState("combinada");
    const [incluirTarefasFuturas, setIncluirTarefasFuturas] = useState(true);
    const [sessoesCalendario, setSessoesCalendario] = useState<SessaoPlanejada[]>([]);
    const [mesCalendario, setMesCalendario] = useState(() => new Date());
    const [diaSelecionado, setDiaSelecionado] = useState(dataLocalAtual());
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [sessoesConcluindo, setSessoesConcluindo] = useState<string[]>([]);

    async function carregarHorarios() {
        setCarregandoHorarios(true);

        try {
            setHorarios(await listarHorariosDisponiveis());
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível carregar os horários."
            );
        } finally {
            setCarregandoHorarios(false);
        }
    }

    useEffect(() => {
        void carregarHorarios();
        void listarEstrategiasPlanejamento().then(setEstrategias).catch((falha: unknown) => {
            setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as estratégias.");
        });
    }, []);

    useEffect(() => {
        void listarSessoesCalendario(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1)
            .then(setSessoesCalendario)
            .catch((falha: unknown) => setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as sessões salvas."));
    }, [mesCalendario]);

    useEffect(() => {
        let ativo = true;
        void buscarPlanoSemanal(dataInicio)
            .then((planoSalvo) => {
                if (ativo) {
                    setPlano(planoSalvo);
                    setEstrategiaSelecionada(planoSalvo.estrategia);
                }
            })
            .catch(() => {
                if (ativo) setPlano(null);
            });
        return () => { ativo = false; };
    }, [dataInicio]);

    function atualizarCampo(
        campo: keyof DadosHorarioDisponivel,
        valor: number | string
    ) {
        setFormulario((atual) => ({ ...atual, [campo]: valor }));
    }

    function limparFormulario() {
        setFormulario({ diaSemana: 1, horaInicio: "09:00", horaFim: "10:00" });
        setHorarioEditandoId(null);
    }

    async function salvarHorario(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setErro("");
        setSucesso("");
        setSalvandoHorario(true);

        try {
            if (horarioEditandoId) {
                await atualizarHorarioDisponivel(horarioEditandoId, formulario);
                setSucesso("Horário atualizado com sucesso.");
            } else {
                await criarHorarioDisponivel(formulario);
                setSucesso("Horário adicionado com sucesso.");
            }

            limparFormulario();
            setPlano(null);
            await carregarHorarios();
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível salvar o horário."
            );
        } finally {
            setSalvandoHorario(false);
        }
    }

    function editarHorario(horario: HorarioDisponivel) {
        setFormulario({
            diaSemana: horario.diaSemana,
            horaInicio: horario.horaInicio,
            horaFim: horario.horaFim
        });
        setHorarioEditandoId(horario.id);
        setErro("");
    }

    async function removerHorario(horario: HorarioDisponivel) {
        setErro("");
        setSucesso("");

        try {
            await excluirHorarioDisponivel(horario.id);

            if (horarioEditandoId === horario.id) {
                limparFormulario();
            }

            setPlano(null);
            setSucesso("Horário removido.");
            await carregarHorarios();
        } catch (erro) {
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível remover o horário."
            );
        }
    }

    async function gerarPlano(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        const reorganizando = plano !== null;
        setErro("");
        setSucesso("");
        setGerandoPlano(true);

        try {
            const novoPlano = await gerarPlanoSemanal(dataInicio, estrategiaSelecionada, incluirTarefasFuturas);
            setPlano(novoPlano);
            setEstrategiaSelecionada(novoPlano.estrategia);
            if (reorganizando) {
                setSucesso("Plano reorganizado. As sessões concluídas saíram do calendário e continuam no seu histórico de estudo.");
            }

            const dataEmFoco = novoPlano.sessoes[0]?.inicio ?? `${dataInicio}T12:00:00`;
            const dataLocal = new Date(dataEmFoco);
            const mesDoPlano = new Date(dataLocal.getFullYear(), dataLocal.getMonth(), 1);
            setMesCalendario(mesDoPlano);
            setDiaSelecionado(chaveDataLocal(dataEmFoco));
            setSessoesCalendario(await listarSessoesCalendario(
                mesDoPlano.getFullYear(),
                mesDoPlano.getMonth() + 1
            ));
        } catch (erro) {
            setPlano(null);
            setErro(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível gerar o plano."
            );
        } finally {
            setGerandoPlano(false);
        }
    }

    async function marcarSessaoConcluida(sessao: SessaoPlanejada) {
        setErro("");
        setSessoesConcluindo((atuais) => [...atuais, sessao.id]);
        try {
            await concluirSessaoPlanejada(sessao);
            await Promise.all([
                listarSessoesCalendario(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1).then(setSessoesCalendario)
            ]);
            setSucesso("Tarefa concluída. O status foi atualizado nas outras abas.");
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível concluir a sessão.");
        } finally {
            setSessoesConcluindo((atuais) => atuais.filter((id) => id !== sessao.id));
        }
    }

    function formatarHora(data: string): string {
        return new Date(data).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatarDuracao(minutos: number): string {
        if (minutos < 60) {
            return `${minutos} min`;
        }

        const horas = Math.floor(minutos / 60);
        const minutosRestantes = Math.round(minutos % 60);

        return minutosRestantes > 0
            ? `${horas} h ${minutosRestantes} min`
            : `${horas} h`;
    }

    function chaveDataLocal(data: string): string {
        const dataSessao = new Date(data);
        const ano = dataSessao.getFullYear();
        const mes = String(dataSessao.getMonth() + 1).padStart(2, "0");
        const dia = String(dataSessao.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    function chaveDia(data: Date): string {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    function deslocarMes(delta: number) {
        setMesCalendario((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
    }

    function obterDiasDoMes(): Date[] {
        const primeiroDia = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), 1);
        const inicioGrade = new Date(
            primeiroDia.getFullYear(),
            primeiroDia.getMonth(),
            primeiroDia.getDate() - primeiroDia.getDay()
        );

        return Array.from({ length: 42 }, (_, indice) =>
            new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + indice)
        );
    }

    return (
        <section className="secao-disciplinas pagina-planejamento">
            <header className="cabecalho">
                <div>
                    <p className="sobretitulo">ORGANIZE SUA ROTINA</p>
                    <h1>Planejamento <span>✦</span></h1>
                    <p className="subtitulo">
                        Informe seus horários livres e monte um plano para os próximos sete dias.
                    </p>
                </div>
            </header>

            <NotificacaoTemporaria mensagem={erro} tipo="erro" />
            <NotificacaoTemporaria mensagem={sucesso} tipo="sucesso" />

            <section className="cartao-planejamento">
                <div className="titulo-secao">
                    <div>
                        <h2>Horários disponíveis</h2>
                        <p>Cadastre intervalos semanais em que você pode estudar.</p>
                    </div>
                </div>

                <form className="formulario-disciplina formulario-horario" onSubmit={salvarHorario}>
                    <label htmlFor="dia-disponivel">Dia da semana</label>
                    <select
                        id="dia-disponivel"
                        value={formulario.diaSemana}
                        onChange={(evento) => atualizarCampo("diaSemana", Number(evento.target.value))}
                    >
                        {DIAS_DA_SEMANA.map((dia, indice) => (
                            <option key={dia} value={indice}>{dia}</option>
                        ))}
                    </select>

                    <div className="campos-horario">
                        <div>
                            <label htmlFor="hora-inicio">Começa às</label>
                            <input
                                id="hora-inicio"
                                type="time"
                                value={formulario.horaInicio}
                                onChange={(evento) => atualizarCampo("horaInicio", evento.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="hora-fim">Termina às</label>
                            <input
                                id="hora-fim"
                                type="time"
                                value={formulario.horaFim}
                                onChange={(evento) => atualizarCampo("horaFim", evento.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="botoes-formulario">
                        {horarioEditandoId && (
                            <button type="button" className="botao-secundario" onClick={limparFormulario}>
                                Cancelar edição
                            </button>
                        )}
                        <button type="submit" className="botao-salvar" disabled={salvandoHorario}>
                            {salvandoHorario
                                ? "Salvando..."
                                : horarioEditandoId
                                    ? "Salvar alterações"
                                    : "+ Adicionar horário"}
                        </button>
                    </div>
                </form>

                <div className="lista-horarios">
                    {carregandoHorarios ? (
                        <p className="mensagem-vazia">Carregando horários...</p>
                    ) : horarios.length === 0 ? (
                        <p className="mensagem-vazia">
                            Você ainda não informou quando pode estudar.
                        </p>
                    ) : (
                        horarios.map((horario) => (
                            <article className="item-horario" key={horario.id}>
                                <div>
                                    <strong>{DIAS_DA_SEMANA[horario.diaSemana]}</strong>
                                    <span>{horario.horaInicio} às {horario.horaFim}</span>
                                </div>
                                <div className="acoes-horario">
                                    <button
                                        type="button"
                                        className="botao-acao editar"
                                        aria-label={`Editar horário de ${DIAS_DA_SEMANA[horario.diaSemana]}`}
                                        onClick={() => editarHorario(horario)}
                                    >
                                        ✎
                                    </button>
                                    <button
                                        type="button"
                                        className="botao-acao excluir"
                                        aria-label={`Remover horário de ${DIAS_DA_SEMANA[horario.diaSemana]}`}
                                        onClick={() => void removerHorario(horario)}
                                    >
                                        ×
                                    </button>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            <section className="cartao-planejamento secao-gerar-plano">
                <div className="titulo-secao">
                    <div>
                        <h2>Plano dos próximos sete dias</h2>
                        <p>O StudyFlow distribui suas tarefas pendentes nos horários cadastrados.</p>
                    </div>
                </div>

                <form className="formulario-gerar-plano" onSubmit={gerarPlano}>
                    <label htmlFor="data-inicio-plano">Começar em</label>
                    <input
                        id="data-inicio-plano"
                        type="date"
                        min={dataLocalAtual()}
                        value={dataInicio}
                        onChange={(evento) => setDataInicio(evento.target.value)}
                        required
                    />
                    <label htmlFor="estrategia-plano">Priorizar por</label>
                    <select
                        id="estrategia-plano"
                        value={estrategiaSelecionada}
                        onChange={(evento) => setEstrategiaSelecionada(evento.target.value)}
                        required
                    >
                        {(estrategias.length > 0 ? estrategias : [{
                            id: "combinada", nome: "Equilibrada", descricao: "Combina prazo, dificuldade e peso."
                        }]).map((estrategia) => (
                            <option value={estrategia.id} key={estrategia.id}>{estrategia.nome}</option>
                        ))}
                    </select>
                    <label htmlFor="escopo-plano">Quais tarefas incluir?</label>
                    <select
                        id="escopo-plano"
                        value={incluirTarefasFuturas ? "adiantar" : "semana"}
                        onChange={(evento) => setIncluirTarefasFuturas(evento.target.value === "adiantar")}
                    >
                        <option value="semana">Só tarefas com prazo nos próximos 7 dias</option>
                        <option value="adiantar">Incluir tarefas futuras para adiantar</option>
                    </select>
                    <button type="submit" className="botao-salvar" disabled={gerandoPlano}>
                        {gerandoPlano
                            ? plano ? "Reorganizando plano..." : "Montando e salvando..."
                            : plano ? "Reorganizar plano" : "Gerar plano semanal"}
                    </button>
                </form>

                <div className="resultado-planejamento">
                        {plano && plano.prioridades.length > 0 && (
                            <section className="prioridades-planejamento">
                                <div className="titulo-secao">
                                    <div>
                                        <h3>Ordem de prioridade</h3>
                                        <p>
                                            {estrategias.find((item) => item.id === plano.estrategia)?.descricao
                                                ?? "Tarefas ordenadas pela estratégia selecionada."}
                                        </p>
                                    </div>
                                    <span className="estrategia-salva">
                                        {estrategias.find((item) => item.id === plano.estrategia)?.nome ?? "Equilibrada"}
                                    </span>
                                </div>
                                <ol className="lista-prioridades">
                                    {plano.prioridades.map((item) => (
                                        <li key={item.tarefaId}>
                                            <span className="posicao-prioridade">{item.prioridade.toFixed(0)}</span>
                                            <div>
                                                <strong>{item.titulo}</strong>
                                                <small>{item.explicacao}</small>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}
                        {plano && plano.sessoes.length === 0 && plano.tarefasSemTempo.length === 0 && (
                            <p className="mensagem-vazia">
                                Não há tarefas pendentes para planejar nessa semana.
                            </p>
                        )}

                            <div className="calendario-container">
                                <div className="controles-calendario">
                                    <div className="navegacao-mes">
                                        <button type="button" aria-label="Mês anterior" onClick={() => deslocarMes(-1)}>‹</button>
                                        <h3>{mesCalendario.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3>
                                        <button type="button" aria-label="Próximo mês" onClick={() => deslocarMes(1)}>›</button>
                                    </div>
                                    <button
                                        type="button"
                                        className="botao-hoje-calendario"
                                        onClick={() => {
                                            const hoje = new Date();
                                            setMesCalendario(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
                                            setDiaSelecionado(dataLocalAtual());
                                        }}
                                    >Hoje</button>
                                </div>
                                <div className="grade-calendario" role="grid" aria-label="Calendário mensal">
                                    {DIAS_DA_SEMANA.map((dia) => (
                                        <div className="nome-dia-calendario" role="columnheader" key={dia}>
                                            {dia.slice(0, 3)}
                                        </div>
                                    ))}
                                    {obterDiasDoMes().map((dia) => {
                                        const chave = chaveDia(dia);
                                        const sessoesDoDia = sessoesCalendario.filter(
                                            (sessao) => chaveDataLocal(sessao.inicio) === chave
                                        );
                                        const foraDoMes = dia.getMonth() !== mesCalendario.getMonth();
                                        const hoje = chave === dataLocalAtual();

                                        return (
                                            <button
                                                type="button"
                                                role="gridcell"
                                                aria-selected={diaSelecionado === chave}
                                                className={`celula-calendario${foraDoMes ? " fora-do-mes" : ""}${hoje ? " dia-hoje" : ""}${diaSelecionado === chave ? " dia-selecionado" : ""}`}
                                                key={chave}
                                                onClick={() => setDiaSelecionado(chave)}
                                            >
                                                <span className="numero-dia-calendario">{dia.getDate()}</span>
                                                <span className="eventos-calendario">
                                                    {sessoesDoDia.slice(0, 2).map((sessao) => (
                                                        <span className="evento-calendario" key={sessao.id}>
                                                            <strong>{formatarHora(sessao.inicio)}</strong> {sessao.titulo}
                                                        </span>
                                                    ))}
                                                    {sessoesDoDia.length > 2 && (
                                                        <span className="mais-eventos">+{sessoesDoDia.length - 2} mais</span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <section className="detalhes-dia-calendario" aria-live="polite">
                                    <h4>{new Date(`${diaSelecionado}T12:00:00`).toLocaleDateString("pt-BR", {
                                        weekday: "long", day: "numeric", month: "long"
                                    })}</h4>
                                    {sessoesCalendario.filter((sessao) => chaveDataLocal(sessao.inicio) === diaSelecionado).length > 0 ? (
                                        sessoesCalendario
                                            .filter((sessao) => chaveDataLocal(sessao.inicio) === diaSelecionado)
                                            .map((sessao) => (
                                                <article className="sessao-detalhe-calendario" key={sessao.id}>
                                                    <strong>{sessao.titulo}</strong>
                                                    <span>{formatarHora(sessao.inicio)}–{formatarHora(sessao.fim)} · {formatarDuracao(sessao.duracaoMinutos)}</span>
                                                    <small>Prioridade {sessao.prioridade.toFixed(0)}/100 · {sessao.explicacaoPrioridade}</small>
                                                    {sessao.concluida ? (
                                                        <small className="sessao-ja-concluida">✓ Sessão concluída</small>
                                                    ) : (
                                                        <button type="button" className="botao-concluir-sessao" disabled={sessoesConcluindo.includes(sessao.id)} onClick={() => void marcarSessaoConcluida(sessao)}>
                                                            {sessoesConcluindo.includes(sessao.id) ? "Salvando..." : "Concluir tarefa e sessão"}
                                                        </button>
                                                    )}
                                                </article>
                                            ))
                                    ) : (
                                        <p className="dia-sem-sessao">Nenhuma sessão planejada para este dia.</p>
                                    )}
                                </section>
                            </div>

                        {plano && plano.tarefasSemTempo.some((tarefa) => tarefa.diasAtraso === undefined) && (
                            <div className="tarefas-sem-tempo">
                                <strong>Sem tempo suficiente nesta semana</strong>
                                <ul>
                                    {plano.tarefasSemTempo.filter((tarefa) => tarefa.diasAtraso === undefined).map((tarefa) => (
                                        <li key={tarefa.id}>{tarefa.titulo}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {plano && plano.tarefasSemTempo.some((tarefa) => tarefa.diasAtraso !== undefined) && (
                            <div className="tarefas-atrasadas">
                                <strong>Prazo vencido</strong>
                                <ul>
                                    {plano.tarefasSemTempo.filter((tarefa) => tarefa.diasAtraso !== undefined).map((tarefa) => (
                                        <li key={tarefa.id}>{tarefa.titulo} está atrasada há {tarefa.diasAtraso} {tarefa.diasAtraso === 1 ? "dia" : "dias"}.</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                </div>
            </section>
        </section>
    );
}

export default Planejamento;
