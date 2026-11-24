import { useEffect, useRef, useState } from "react";
import {
    atualizarHorarioDisponivel,
    criarHorarioDisponivel,
    excluirHorarioDisponivel,
    gerarPlanoSemanal,
    buscarPlanoSemanal,
    listarEstrategiasPlanejamento,
    listarHorariosDisponiveis,
    listarSessoesCalendario,
    moverSessaoCalendario,
    listarHistoricoPlanejamentos,
    buscarPlanejamentoHistorico,
    buscarResumoEstimativas,
    excluirHistoricoPlanejamentos,
    type DadosHorarioDisponivel,
    type EstrategiaPlanejamento,
    type HorarioDisponivel,
    type PlanoSemanal,
    type SessaoPlanejada,
    type HistoricoPlanejamento,
    type ResumoEstimativas
} from "../services/planejamento";
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
    const [estrategiaSelecionada, setEstrategiaSelecionada] = useState(() => localStorage.getItem("studyflow_estrategia_padrao") || "combinada");
    const [incluirTarefasFuturas, setIncluirTarefasFuturas] = useState(() => localStorage.getItem("studyflow_incluir_futuras") !== "false");
    const [inicioSemana] = useState(() => localStorage.getItem("studyflow_inicio_semana") === "segunda" ? 1 : 0);
    const [sessoesCalendario, setSessoesCalendario] = useState<SessaoPlanejada[]>([]);
    const [mesCalendario, setMesCalendario] = useState(() => new Date());
    const [diaSelecionado, setDiaSelecionado] = useState(dataLocalAtual());
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [historico, setHistorico] = useState<HistoricoPlanejamento[]>([]);
    const [historicoSelecionado, setHistoricoSelecionado] = useState<string[]>([]);
    const [historicoVisualizadoId, setHistoricoVisualizadoId] = useState<string | null>(null);
    const [excluindoHistorico, setExcluindoHistorico] = useState(false);
    const [visualizacaoHistorica, setVisualizacaoHistorica] = useState(false);
    const [sessaoArrastada, setSessaoArrastada] = useState<string | null>(null);
    const [diaAlvoArraste, setDiaAlvoArraste] = useState<string | null>(null);
    const [movendoSessao, setMovendoSessao] = useState(false);
    const [resumoEstimativas, setResumoEstimativas] = useState<ResumoEstimativas>({ tarefasConcluidasUsadas: 0, fator: 1, adaptacaoAtiva: false });
    const reorganizacaoAutomaticaRef = useRef("");

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
        void listarHistoricoPlanejamentos().then((itens) => { setHistorico(itens); setHistoricoSelecionado([]); }).catch(() => undefined);
        void buscarResumoEstimativas().then(setResumoEstimativas).catch(() => undefined);
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

    useEffect(() => {
        if (!plano || gerandoPlano || visualizacaoHistorica) return;
        const inicioSemana = new Date(`${dataInicio}T00:00:00`);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
        const hoje = dataLocalAtual();
        if (hoje < dataInicio || hoje > chaveDia(fimSemana)) return;

        const agora = Date.now();
        const idsPerdidos = plano.sessoes
            .filter((sessao) => !sessao.concluida && new Date(sessao.fim).getTime() < agora)
            .map((sessao) => sessao.id)
            .sort();
        if (idsPerdidos.length === 0) return;

        const assinatura = `${dataInicio}:${idsPerdidos.join(",")}`;
        if (reorganizacaoAutomaticaRef.current === assinatura) return;
        reorganizacaoAutomaticaRef.current = assinatura;
        setGerandoPlano(true);
        setErro("");
        setSucesso("");

        void gerarPlanoSemanal(dataInicio, plano.estrategia, incluirTarefasFuturas)
            .then(async (novoPlano) => {
                setPlano(novoPlano);
                setEstrategiaSelecionada(novoPlano.estrategia);
                const dataEmFoco = novoPlano.sessoes[0]?.inicio ?? new Date().toISOString();
                const dataLocal = new Date(dataEmFoco);
                const mesDoPlano = new Date(dataLocal.getFullYear(), dataLocal.getMonth(), 1);
                setMesCalendario(mesDoPlano);
                setDiaSelecionado(chaveDataLocal(dataEmFoco));
                setSessoesCalendario(await listarSessoesCalendario(mesDoPlano.getFullYear(), mesDoPlano.getMonth() + 1));
                void listarHistoricoPlanejamentos().then((itens) => { setHistorico(itens); setHistoricoSelecionado([]); }).catch(() => undefined);
                setSucesso("O plano foi reorganizado automaticamente após sessões que passaram sem serem concluídas.");
            })
            .catch((falha: unknown) => {
                setErro(falha instanceof Error ? falha.message : "Não foi possível reorganizar automaticamente o plano. Você pode tentar pelo botão abaixo.");
            })
            .finally(() => setGerandoPlano(false));
    }, [plano, dataInicio, gerandoPlano, incluirTarefasFuturas, visualizacaoHistorica]);

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
        setVisualizacaoHistorica(false);

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
            void listarHistoricoPlanejamentos().then((itens) => { setHistorico(itens); setHistoricoSelecionado([]); }).catch(() => undefined);
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

    async function abrirHistorico(item: HistoricoPlanejamento) {
        setErro("");
        setSucesso("");
        try {
            const planoAntigo = await buscarPlanejamentoHistorico(item.id);
            setPlano(planoAntigo);
            setVisualizacaoHistorica(true);
            setHistoricoVisualizadoId(item.id);
            const primeiraData = planoAntigo.sessoes[0]?.inicio ?? `${planoAntigo.dataInicio}T12:00:00`;
            const data = new Date(primeiraData);
            const mes = new Date(data.getFullYear(), data.getMonth(), 1);
            setMesCalendario(mes);
            setDiaSelecionado(chaveDataLocal(primeiraData));
            setSessoesCalendario(planoAntigo.sessoes);
            setSucesso(`Visualizando o planejamento salvo em ${new Date(item.criadoEm).toLocaleString("pt-BR")}.`);
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível abrir o histórico.");
        }
    }

    async function moverSessaoParaDia(sessaoId: string, data: string) {
        const sessao = sessoesCalendario.find((item) => item.id === sessaoId);
        if (!sessao || sessao.concluida || visualizacaoHistorica || movendoSessao) return;
        const inicioAtual = new Date(sessao.inicio);
        const hora = `${String(inicioAtual.getHours()).padStart(2, "0")}:${String(inicioAtual.getMinutes()).padStart(2, "0")}`;
        setMovendoSessao(true);
        setSessaoArrastada(null);
        setDiaAlvoArraste(null);
        setErro("");
        try {
            const movida = await moverSessaoCalendario(sessao.id, data, hora);
            const dataNova = new Date(`${data}T${hora}:00`);
            const mesNovo = new Date(dataNova.getFullYear(), dataNova.getMonth(), 1);
            setMesCalendario(mesNovo);
            setDiaSelecionado(data);
            const sessoesAtualizadas = await listarSessoesCalendario(mesNovo.getFullYear(), mesNovo.getMonth() + 1).catch(() => [movida]);
            setSessoesCalendario(sessoesAtualizadas);
            if (plano && !visualizacaoHistorica) void buscarPlanoSemanal(plano.dataInicio).then(setPlano).catch(() => undefined);
            setSucesso("Sessão movida. O calendário e o plano foram atualizados.");
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível mover a sessão.");
        } finally {
            setMovendoSessao(false);
        }
    }

    async function voltarAoPlanoAtual() {
        setVisualizacaoHistorica(false);
        setHistoricoVisualizadoId(null);
        try {
            const atual = await buscarPlanoSemanal(dataInicio);
            setPlano(atual);
            const mes = new Date();
            setMesCalendario(new Date(mes.getFullYear(), mes.getMonth(), 1));
            setDiaSelecionado(dataLocalAtual());
            setSessoesCalendario(await listarSessoesCalendario(mes.getFullYear(), mes.getMonth() + 1));
        } catch {
            setPlano(null);
            setSessoesCalendario([]);
        }
    }

    async function excluirHistorico(ids?: string[]) {
        const idsParaExcluir = ids ?? historico.map((item) => item.id);
        if (idsParaExcluir.length === 0 || excluindoHistorico) return;
        const mensagem = ids
            ? `Excluir ${ids.length} ${ids.length === 1 ? "planejamento selecionado" : "planejamentos selecionados"}? Essa ação não pode ser desfeita.`
            : `Excluir todo o histórico (${idsParaExcluir.length} ${idsParaExcluir.length === 1 ? "planejamento" : "planejamentos"})? Essa ação não pode ser desfeita.`;
        if (!window.confirm(mensagem)) return;
        setExcluindoHistorico(true);
        setErro("");
        try {
            await excluirHistoricoPlanejamentos(ids);
            const removidos = new Set(idsParaExcluir);
            setHistorico((atuais) => atuais.filter((item) => !removidos.has(item.id)));
            setHistoricoSelecionado((atuais) => atuais.filter((id) => !removidos.has(id)));
            if (historicoVisualizadoId && removidos.has(historicoVisualizadoId)) await voltarAoPlanoAtual();
            setSucesso(ids ? "Planejamentos selecionados excluídos." : "Histórico de planejamentos apagado.");
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível excluir os planejamentos.");
        } finally {
            setExcluindoHistorico(false);
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
        const deslocamento = (primeiroDia.getDay() - inicioSemana + 7) % 7;
        const inicioGrade = new Date(
            primeiroDia.getFullYear(),
            primeiroDia.getMonth(),
            primeiroDia.getDate() - deslocamento
        );

        return Array.from({ length: 42 }, (_, indice) =>
            new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + indice)
        );
    }

    const diasOrdenados = [...DIAS_DA_SEMANA.slice(inicioSemana), ...DIAS_DA_SEMANA.slice(0, inicioSemana)];

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
                        <p className="nota-estimativa-adaptativa" role="status">
                            {(plano?.ajusteEstimativa ?? resumoEstimativas).adaptacaoAtiva
                                ? `Este plano usou estimativas ajustadas pelo histórico de ${(plano?.ajusteEstimativa ?? resumoEstimativas).tarefasConcluidasUsadas} tarefas concluídas (${(plano?.ajusteEstimativa ?? resumoEstimativas).fator > 1 ? "+" : ""}${Math.round(((plano?.ajusteEstimativa ?? resumoEstimativas).fator - 1) * 100)}%). A duração cadastrada nas tarefas continua igual.`
                                : `As estimativas começam a se adaptar após 3 tarefas concluídas com tempo estudado registrado. ${(plano?.ajusteEstimativa ?? resumoEstimativas).tarefasConcluidasUsadas}/3 consideradas até agora.`}
                        </p>
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
                                {movendoSessao && <p className="mensagem-vazia" role="status">Salvando nova data…</p>}
                                <div className="grade-calendario" role="grid" aria-label="Calendário mensal">
                                    {diasOrdenados.map((dia) => (
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
                                            <div
                                                role="gridcell"
                                                tabIndex={0}
                                                aria-selected={diaSelecionado === chave}
                                                className={`celula-calendario${foraDoMes ? " fora-do-mes" : ""}${hoje ? " dia-hoje" : ""}${diaSelecionado === chave ? " dia-selecionado" : ""}${diaAlvoArraste === chave ? " dia-soltar-sessao" : ""}`}
                                                key={chave}
                                                onClick={() => setDiaSelecionado(chave)}
                                                onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); setDiaSelecionado(chave); } }}
                                                onDragOver={(evento) => { if (sessaoArrastada && !visualizacaoHistorica) { evento.preventDefault(); setDiaAlvoArraste(chave); } }}
                                                onDragLeave={() => setDiaAlvoArraste((atual) => atual === chave ? null : atual)}
                                                onDrop={(evento) => { evento.preventDefault(); setDiaAlvoArraste(null); if (sessaoArrastada) void moverSessaoParaDia(sessaoArrastada, chave); }}
                                            >
                                                <span className="numero-dia-calendario">{dia.getDate()}</span>
                                                <span className="eventos-calendario">
                                                    {sessoesDoDia.slice(0, 2).map((sessao) => (
                                                        <span className={`evento-calendario${sessaoArrastada === sessao.id ? " evento-arrastando" : ""}`} key={sessao.id} draggable={!sessao.concluida && !visualizacaoHistorica} title={visualizacaoHistorica ? "Sessões do histórico são somente leitura" : "Arraste para outro dia para reagendar"} onDragStart={(evento) => { if (visualizacaoHistorica || sessao.concluida) { evento.preventDefault(); return; } setSessaoArrastada(sessao.id); evento.dataTransfer.setData("text/plain", sessao.id); }} onDragEnd={() => { setSessaoArrastada(null); setDiaAlvoArraste(null); }}>
                                                            <strong>{formatarHora(sessao.inicio)}</strong> {sessao.titulo}
                                                        </span>
                                                    ))}
                                                    {sessoesDoDia.length > 2 && (
                                                        <span className="mais-eventos">+{sessoesDoDia.length - 2} mais</span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <section className="detalhes-dia-calendario" aria-live="polite">
                                    <h4>{new Date(`${diaSelecionado}T12:00:00`).toLocaleDateString("pt-BR", {
                                        weekday: "long", day: "numeric", month: "long"
                                    })}</h4>
                                    {!visualizacaoHistorica && <p className="dica-arrastar-calendario">Dica: arraste uma sessão para outro dia para reagendá-la. O horário e a duração serão mantidos.</p>}
                                    {sessoesCalendario.filter((sessao) => chaveDataLocal(sessao.inicio) === diaSelecionado).length > 0 ? (
                                        sessoesCalendario
                                            .filter((sessao) => chaveDataLocal(sessao.inicio) === diaSelecionado)
                                            .map((sessao) => (
                                                <article className="sessao-detalhe-calendario" key={sessao.id} draggable={!sessao.concluida && !visualizacaoHistorica} title={!sessao.concluida && !visualizacaoHistorica ? "Arraste para outro dia para reagendar" : undefined} onDragStart={(evento) => { if (visualizacaoHistorica || sessao.concluida) { evento.preventDefault(); return; } setSessaoArrastada(sessao.id); evento.dataTransfer.setData("text/plain", sessao.id); }} onDragEnd={() => setSessaoArrastada(null)}>
                                                    <strong>{sessao.titulo}</strong>
                                                    <span>{formatarHora(sessao.inicio)}–{formatarHora(sessao.fim)} · {formatarDuracao(sessao.duracaoMinutos)}</span>
                                                    <small>Prioridade {sessao.prioridade.toFixed(0)}/100 · {sessao.explicacaoPrioridade}</small>
                                                    <small>{visualizacaoHistorica ? "Plano histórico · somente leitura" : "Para concluir esta atividade, use Minhas tarefas."}</small>
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
                        {visualizacaoHistorica && (
                            <div className="aviso-historico-planejamento">
                                <span>Você está vendo uma versão salva do plano. Essa visualização é somente leitura.</span>
                                <button type="button" className="botao-secundario" onClick={() => void voltarAoPlanoAtual()}>Voltar ao plano atual</button>
                            </div>
                        )}
                        <details className="cartao-planejamento painel-historico-planejamento">
                            <summary className="titulo-secao titulo-historico-recolhivel">
                                <div><h2>Histórico de planejamentos</h2><p>Abra para consultar, selecionar ou apagar versões anteriores.</p></div>
                                <span className="indicador-historico">{historico.length} {historico.length === 1 ? "plano" : "planos"}</span>
                            </summary>
                            <div className="acoes-historico-planejamento">
                                <label className="selecao-todos-historico">
                                    <input type="checkbox" checked={historico.length > 0 && historicoSelecionado.length === historico.length} disabled={historico.length === 0 || excluindoHistorico} onChange={(evento) => setHistoricoSelecionado(evento.target.checked ? historico.map((item) => item.id) : [])} />
                                    Selecionar todos
                                </label>
                                <div>
                                    <button type="button" className="botao-secundario" disabled={historicoSelecionado.length === 0 || excluindoHistorico} onClick={() => void excluirHistorico(historicoSelecionado)}>{excluindoHistorico ? "Apagando…" : `Apagar selecionados${historicoSelecionado.length ? ` (${historicoSelecionado.length})` : ""}`}</button>
                                    <button type="button" className="botao-excluir-historico" disabled={historico.length === 0 || excluindoHistorico} onClick={() => void excluirHistorico()}>{excluindoHistorico ? "Apagando…" : "Apagar todo o histórico"}</button>
                                </div>
                            </div>
                            {historico.length === 0 ? <p className="mensagem-vazia">Nenhum planejamento salvo no histórico.</p> : (
                                <div className="lista-historico-planejamento">
                                    {historico.map((item) => (
                                        <article key={item.id}>
                                            <label className="item-selecao-historico">
                                                <input type="checkbox" checked={historicoSelecionado.includes(item.id)} disabled={excluindoHistorico} onChange={() => setHistoricoSelecionado((atuais) => atuais.includes(item.id) ? atuais.filter((id) => id !== item.id) : [...atuais, item.id])} />
                                                <span><strong>{new Date(`${item.dataInicio}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</strong><small>{new Date(item.criadoEm).toLocaleString("pt-BR")} · {item.totalSessoes} {item.totalSessoes === 1 ? "sessão" : "sessões"}</small></span>
                                            </label>
                                            <div className="botoes-item-historico">
                                                <button type="button" className="botao-secundario" onClick={() => void abrirHistorico(item)}>Ver plano</button>
                                                <button type="button" className="botao-excluir-historico" disabled={excluindoHistorico} onClick={() => void excluirHistorico([item.id])}>Apagar</button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </details>
                </div>
            </section>
        </section>
    );
}

export default Planejamento;
