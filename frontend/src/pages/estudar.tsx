import { useEffect, useMemo, useState } from "react";
import { listarTarefas, type Tarefa } from "../services/tarefas";
import { buscarEstudoDoDia, buscarResumoPeriodo, registrarEstudo, type ResumoEstudoDiario, type ResumoPeriodo } from "../services/sessoes-estudo";
import { buscarResumoPlanejado, type ResumoPlanejado } from "../services/planejamento";
import NotificacaoTemporaria from "../components/notificacao-temporaria";

function hojeLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lerDuracaoPadraoPomodoro(): number {
    const salva = Number(localStorage.getItem("studyflow_duracao_pomodoro"));
    return Number.isInteger(salva) && salva >= 5 && salva <= 180 ? salva : 25;
}

function lerPreferenciaEmMinutos(chave: string, padrao: number): number {
    const valor = Number(localStorage.getItem(chave));
    return Number.isInteger(valor) && valor >= 1 && valor <= 180 ? valor : padrao;
}

function avisarNotificacaoPomodoro(titulo: string, mensagem: string) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notificacao = new Notification(titulo, {
        body: mensagem,
        icon: "/logo-studyflow.png",
        requireInteraction: false
    });
    notificacao.onclick = () => { window.focus(); notificacao.close(); };
}

type FasePomodoro = "foco" | "pausa-curta" | "pausa-longa";

export default function Estudar() {
    const [tarefas, setTarefas] = useState<Tarefa[]>([]);
    const [tarefaId, setTarefaId] = useState("");
    const [resumo, setResumo] = useState<ResumoEstudoDiario>({ sessoes: [], totalSegundos: 0 });
    const [duracaoPomodoro, setDuracaoPomodoro] = useState(lerDuracaoPadraoPomodoro);
    const [segundos, setSegundos] = useState(() => lerDuracaoPadraoPomodoro() * 60);
    const [duracaoPausaCurta] = useState(() => lerPreferenciaEmMinutos("studyflow_pausa_minutos", 5));
    const [duracaoPausaLonga] = useState(() => lerPreferenciaEmMinutos("studyflow_pausa_longa_minutos", 15));
    const [intervaloPausaLonga] = useState(() => lerPreferenciaEmMinutos("studyflow_intervalo_pausa_longa", 4));
    const [fasePomodoro, setFasePomodoro] = useState<FasePomodoro>("foco");
    const [ciclosFoco, setCiclosFoco] = useState(() => {
        const salvos = Number(localStorage.getItem("studyflow_ciclos_foco"));
        return Number.isInteger(salvos) && salvos >= 0 ? salvos : 0;
    });
    const [rodando, setRodando] = useState(false);
    const [cronometroLivreRodando, setCronometroLivreRodando] = useState(false);
    const [segundosLivres, setSegundosLivres] = useState(0);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [tempoManual, setTempoManual] = useState("30");
    const [minutosSessaoAtual, setMinutosSessaoAtual] = useState(0);
    const [periodoGrafico, setPeriodoGrafico] = useState<"hoje" | "semana" | "mes">("semana");
    const [resumoPeriodo, setResumoPeriodo] = useState<ResumoPeriodo>({ totalSegundos: 0, dias: [], porTipo: [], porFaixaHorario: [] });
    const [resumoPlanejado, setResumoPlanejado] = useState<ResumoPlanejado>({ totalMinutos: 0, dias: [] });

    async function atualizarResumo() {
        setResumo(await buscarEstudoDoDia(hojeLocal()));
        if (periodoGrafico !== "hoje") {
            setResumoPeriodo(await buscarResumoPeriodo(periodoGrafico));
        }
        setResumoPlanejado(await buscarResumoPlanejado(periodoGrafico));
    }

    useEffect(() => {
        void Promise.all([listarTarefas(), atualizarResumo()]).then(([lista]) => {
            const pendentes = lista.filter((t) => t.estado !== "concluida");
            setTarefas(pendentes);
            setTarefaId(pendentes[0]?.id ?? "");
        }).catch((falha: unknown) => setErro(falha instanceof Error ? falha.message : "Não foi possível carregar o espaço de estudo."));
    }, []);

    useEffect(() => {
        const requisicoes: Promise<void>[] = [buscarResumoPlanejado(periodoGrafico).then((resumo) => { setResumoPlanejado(resumo); })];
        if (periodoGrafico !== "hoje") {
            requisicoes.push(buscarResumoPeriodo(periodoGrafico).then((resumo) => { setResumoPeriodo(resumo); }));
        }
        void Promise.all(requisicoes).catch(() => undefined);
    }, [periodoGrafico]);

    useEffect(() => {
        if (!rodando) return;
        const timer = window.setInterval(() => setSegundos((restantes) => Math.max(0, restantes - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [rodando]);

    useEffect(() => {
        if (!rodando || segundos !== 0) return;
        setRodando(false);
        if (fasePomodoro === "foco") {
            void concluirPomodoro();
        } else {
            avisarNotificacaoPomodoro("Pausa concluída", "Sua pausa terminou. Quando quiser, comece o próximo bloco de foco.");
            setFasePomodoro("foco");
            setSegundos(duracaoPomodoro * 60);
            setSucesso("Pausa concluída. Quando quiser, comece seu próximo bloco de foco.");
        }
    }, [rodando, segundos, fasePomodoro, duracaoPomodoro]);

    useEffect(() => {
        if (!cronometroLivreRodando) return;
        const timer = window.setInterval(() => setSegundosLivres((valor) => valor + 1), 1000);
        return () => window.clearInterval(timer);
    }, [cronometroLivreRodando]);

    const tempoFormatado = useMemo(() => `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`, [segundos]);

    function iniciarPomodoro() {
        if (fasePomodoro === "foco" && !tarefaId) { avisarSemTarefa(); return; }
        setErro("");
        if (segundos === 0) setSegundos(duracaoPomodoro * 60);
        setRodando(true);
    }

    function avisarSemTarefa() {
        setErro("");
        window.setTimeout(() => {
            setErro("Não há nenhuma tarefa pendente cadastrada para estudar. Cadastre uma tarefa ou reabra uma concluída.");
        }, 0);
    }

    function iniciarCronometroLivre() {
        if (!tarefaId) { avisarSemTarefa(); return; }
        setErro("");
        setCronometroLivreRodando(true);
    }

    function continuarCronometroLivre() {
        if (!tarefaId) { avisarSemTarefa(); return; }
        setErro("");
        setCronometroLivreRodando(true);
    }

    async function concluirPomodoro() {
        if (!tarefaId) return;
        setSalvando(true);
        try {
            await registrarEstudo(tarefaId, duracaoPomodoro * 60, "pomodoro");
            setMinutosSessaoAtual(0);
            await atualizarResumo();
            const novoCiclo = ciclosFoco + 1;
            const proximaFase: FasePomodoro = novoCiclo % intervaloPausaLonga === 0 ? "pausa-longa" : "pausa-curta";
            setCiclosFoco(novoCiclo);
            localStorage.setItem("studyflow_ciclos_foco", String(novoCiclo));
            setFasePomodoro(proximaFase);
            setSegundos((proximaFase === "pausa-longa" ? duracaoPausaLonga : duracaoPausaCurta) * 60);
            setSucesso(`Bloco de foco salvo. ${proximaFase === "pausa-longa" ? "A pausa longa" : "A pausa curta"} começou.`);
            avisarNotificacaoPomodoro("Tempo de foco encerrado", `Seu bloco foi salvo. Agora começou a ${proximaFase === "pausa-longa" ? "pausa longa" : "pausa curta"}.`);
            setRodando(true);
        } catch (falha) {
            setFasePomodoro("foco");
            setSegundos(duracaoPomodoro * 60);
            setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o tempo estudado.");
        } finally { setSalvando(false); }
    }

    async function salvarTempoManual() {
        if (!tarefaId) { avisarSemTarefa(); return; }
        const duracao = converterTempoDigitado(tempoManual);
        if (!duracao || duracao > 720) {
            setErro("Digite um tempo válido, como 45, 1h ou 1h 20min (máximo de 12 horas).");
            return;
        }
        setSalvando(true);
        try {
            await registrarEstudo(tarefaId, duracao * 60, "manual");
            await atualizarResumo();
            setErro("");
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível registrar o tempo.");
        } finally { setSalvando(false); }
    }

    async function encerrarCronometroLivre() {
        if (!tarefaId) { setErro("Selecione uma tarefa antes de iniciar o cronômetro."); return; }
        const segundosEstudados = segundosLivres;
        setErro("");
        setSucesso("");
        setCronometroLivreRodando(false);
        setSalvando(true);
        try {
            await registrarEstudo(tarefaId, segundosEstudados, "cronometro");
            setSegundosLivres(0);
            await atualizarResumo();
            setSucesso(`Cronômetro encerrado. ${formatarTempo(segundosEstudados)} registrados com sucesso.`);
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o tempo do cronômetro.");
        } finally { setSalvando(false); }
    }

    function converterTempoDigitado(valor: string): number | null {
        const texto = valor.trim().toLowerCase();
        if (/^\d+$/.test(texto)) return Number(texto);
        const partes = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*(?:min|m))?$/.exec(texto);
        if (!partes || (!partes[1] && !partes[2])) return null;
        const horasDigitadas = Number(partes[1] ?? 0);
        const minutosDigitados = Number(partes[2] ?? 0);
        if (minutosDigitados > 59) return null;
        const total = horasDigitadas * 60 + minutosDigitados;
        return total > 0 ? total : null;
    }

    const horas = Math.floor(resumo.totalSegundos / 3600);
    const minutos = Math.floor((resumo.totalSegundos % 3600) / 60);
    const segundosHoje = resumo.totalSegundos % 60;

    function formatarTempo(totalSegundos: number): string {
        const h = Math.floor(totalSegundos / 3600);
        const m = Math.floor((totalSegundos % 3600) / 60);
        const s = totalSegundos % 60;
        return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}min ` : ""}${s > 0 ? `${s}s` : ""}`.trim();
    }

    function rotuloDia(data: string): string {
        return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }

    const diasEstudados = periodoGrafico === "hoje"
        ? [{ data: hojeLocal(), totalSegundos: resumo.totalSegundos }]
        : resumoPeriodo.dias;
    const diasPlanejadosPorData = new Map(resumoPlanejado.dias.map((dia) => [dia.data, dia.totalMinutos * 60]));
    const diasGrafico = diasEstudados.map((dia) => ({ ...dia, planejadoSegundos: diasPlanejadosPorData.get(dia.data) ?? 0 }));
    const totalGrafico = diasEstudados.reduce((total, dia) => total + dia.totalSegundos, 0);
    const maxHorasGrafico = Math.max(4, Math.ceil(Math.max(...diasGrafico.flatMap((dia) => [dia.totalSegundos, dia.planejadoSegundos]), 0) / 3600));
    const agregadoTipos = periodoGrafico === "hoje"
        ? resumo.sessoes.reduce((agregado, sessao) => { agregado[sessao.tipo] = (agregado[sessao.tipo] ?? 0) + sessao.duracaoSegundos; return agregado; }, {} as Record<string, number>)
        : resumoPeriodo.porTipo.reduce((agregado, item) => { agregado[item.tipo] = item.totalSegundos; return agregado; }, {} as Record<string, number>);
    const tiposGrafico = [
        { id: "pomodoro", label: "Pomodoro" }, { id: "cronometro", label: "Cronômetro livre" },
        { id: "manual", label: "Registro manual" }, { id: "planejada", label: "Planejada" }
    ].map((item) => ({ ...item, segundos: agregadoTipos[item.id] ?? 0 })).filter((item) => item.segundos > 0);
    const maxTipoGrafico = Math.max(1, ...tiposGrafico.map((item) => item.segundos));
    const faixasGrafico = periodoGrafico === "hoje"
        ? resumo.sessoes.reduce((agregado, sessao) => {
            const hora = new Date(sessao.inicio).getHours();
            const faixa = hora < 12 ? "Manhã" : hora < 18 ? "Tarde" : "Noite";
            agregado[faixa] = (agregado[faixa] ?? 0) + sessao.duracaoSegundos;
            return agregado;
        }, {} as Record<string, number>)
        : resumoPeriodo.porFaixaHorario.reduce((agregado, item) => { agregado[item.faixa] = item.totalSegundos; return agregado; }, {} as Record<string, number>);
    const maxFaixaGrafico = Math.max(1, ...Object.values(faixasGrafico));

    return (
        <section className="secao-disciplinas pagina-estudar">
            <header className="cabecalho"><div><p className="sobretitulo">FOCO NO SEU RITMO</p><h1>Hora de estudar <span>✦</span></h1><p className="subtitulo">Use o Pomodoro, cronometre livremente ou registre seu tempo de estudo.</p></div></header>
            <NotificacaoTemporaria mensagem={erro} tipo="erro" />
            <NotificacaoTemporaria mensagem={sucesso} tipo="sucesso" />
            <section className="cartao-estudar resumo-estudo-dia">
                <div className="icone-resumo-estudo">◷</div><div><span>Seu tempo de estudo hoje</span><strong>{horas}h {minutos.toString().padStart(2, "0")}min {segundosHoje.toString().padStart(2, "0")}s</strong></div>
                <small>{resumo.sessoes.length} {resumo.sessoes.length === 1 ? "sessão registrada" : "sessões registradas"}</small>
            </section>
            <section className="cartao-estudar painel-produtividade">
                <div className="cabecalho-grafico"><div><p className="sobretitulo">SEU PROGRESSO</p><h2>Tempo dedicado</h2></div><div className="controles-grafico"><div className="seletor-periodo-grafico"><button type="button" className={periodoGrafico === "hoje" ? "ativo" : ""} onClick={() => setPeriodoGrafico("hoje")}>Hoje</button><button type="button" className={periodoGrafico === "semana" ? "ativo" : ""} onClick={() => setPeriodoGrafico("semana")}>7 dias</button><button type="button" className={periodoGrafico === "mes" ? "ativo" : ""} onClick={() => setPeriodoGrafico("mes")}>Este mês</button></div></div></div>
                <div className="comparacao-tempo-totais">
                    <div><span>Planejado</span><strong>{formatarTempo(resumoPlanejado.totalMinutos * 60) || "0min"}</strong></div>
                    <div><span>Estudado</span><strong className="total-periodo-estudo">{formatarTempo(totalGrafico) || "0min"}</strong></div>
                </div>
                <div className="legenda-comparacao-tempo"><span><i className="legenda-planejado" />Planejado</span><span><i className="legenda-estudado" />Estudado</span></div>
                <div className="grafico-com-escala" role="img" aria-label="Comparação diária entre tempo planejado e tempo estudado, com escala em horas">
                <div className="escala-grafico-horas">
                    {Array.from({ length: maxHorasGrafico + 1 }, (_, hora) => <span key={hora} style={{ bottom: `${(hora / maxHorasGrafico) * 100}%` }}>{hora === 0 ? "0" : `${hora}h`}</span>)}
                </div>
                <div className="grafico-estudo" role="presentation">
                    {diasGrafico.map((dia) => {
                        const alturaEstudado = (dia.totalSegundos / (maxHorasGrafico * 3600)) * 100;
                        const alturaPlanejado = (dia.planejadoSegundos / (maxHorasGrafico * 3600)) * 100;
                        const rotulo = periodoGrafico === "hoje" ? "Hoje" : periodoGrafico === "semana" ? new Date(`${dia.data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") : rotuloDia(dia.data);
                        return <div className="coluna-grafico-estudo" key={dia.data} title={`${rotuloDia(dia.data)}: ${formatarTempo(dia.planejadoSegundos) || "0s"} planejado · ${formatarTempo(dia.totalSegundos) || "0s"} estudado`}><div className="trilho-grafico"><span className="barra-planejada" style={{ height: `${alturaPlanejado}%` }} /><span className="barra-estudada" style={{ height: `${alturaEstudado}%` }} /></div><small>{rotulo}</small></div>;
                    })}
                </div>
                </div>
            </section>
            <div className="grade-estudar">
                <section className="cartao-estudar cronometro-livre">
                    <p className="sobretitulo">CRONÔMETRO LIVRE</p><h2>Conte seu tempo sem limite</h2>
                    <label htmlFor="tarefa-cronometro">O que você vai estudar?</label>
                    <select id="tarefa-cronometro" value={tarefaId} disabled={cronometroLivreRodando || rodando} onChange={(e) => setTarefaId(e.target.value)}>
                        {tarefas.length === 0 && <option value="">Nenhuma tarefa pendente</option>}
                        {tarefas.map((tarefa) => <option key={tarefa.id} value={tarefa.id}>{tarefa.titulo}</option>)}
                    </select>
                    <div className="relogio-livre" aria-live="polite">{String(Math.floor(segundosLivres / 3600)).padStart(2, "0")}:{String(Math.floor((segundosLivres % 3600) / 60)).padStart(2, "0")}:{String(segundosLivres % 60).padStart(2, "0")}</div>
                    <div className="acoes-pomodoro">
                        {!cronometroLivreRodando ? <button className="botao-salvar" type="button" disabled={salvando || rodando} onClick={iniciarCronometroLivre}>Iniciar</button> : <button className="botao-secundario" type="button" onClick={() => setCronometroLivreRodando(false)}>Pausar</button>}
                        {!cronometroLivreRodando && segundosLivres > 0 && <button className="botao-salvar" type="button" disabled={salvando || rodando} onClick={continuarCronometroLivre}>Continuar</button>}
                        {!cronometroLivreRodando && segundosLivres > 0 && <button className="botao-secundario" type="button" disabled={salvando} onClick={() => void encerrarCronometroLivre()}>{salvando ? "Salvando sessão..." : "Encerrar e salvar"}</button>}
                        {!cronometroLivreRodando && segundosLivres === 0 && <button className="botao-secundario" type="button" disabled={salvando || rodando} onClick={() => setSegundosLivres(0)}>Zerar</button>}
                    </div>
                    <p className="dica-pomodoro">Pause quando quiser. Ao encerrar, o tempo será somado à tarefa e ao total de hoje.</p>
                </section>
                <section className="cartao-estudar pomodoro-estudar">
                    <p className="sobretitulo">TÉCNICA POMODORO</p><h2>{fasePomodoro === "foco" ? "Um bloco de foco por vez" : fasePomodoro === "pausa-longa" ? "Hora de uma pausa longa" : "Hora de uma pausa curta"}</h2>
                    <label htmlFor="tarefa-pomodoro">{fasePomodoro === "foco" ? "O que você vai estudar?" : "Tarefa do próximo bloco"}</label>
                    <select id="tarefa-pomodoro" value={tarefaId} disabled={rodando} onChange={(e) => setTarefaId(e.target.value)}>
                        {tarefas.length === 0 && <option value="">Nenhuma tarefa pendente</option>}
                        {tarefas.map((tarefa) => <option key={tarefa.id} value={tarefa.id}>{tarefa.titulo}</option>)}
                    </select>
                    {fasePomodoro === "foco" ? <label htmlFor="duracao-pomodoro">Duração do foco</label> : <p className="rotulo-fase-pomodoro">{fasePomodoro === "pausa-longa" ? "Pausa longa" : "Pausa curta"} · {fasePomodoro === "pausa-longa" ? duracaoPausaLonga : duracaoPausaCurta} minutos</p>}
                    {fasePomodoro === "foco" && <div className="duracao-interativa">
                        <div className="duracao-valor"><strong>{duracaoPomodoro}</strong><span>minutos</span></div>
                        <input
                            id="duracao-pomodoro"
                            className="controle-duracao-foco"
                            aria-label="Duração do foco em minutos"
                            type="range"
                            min={5}
                            max={180}
                            step={5}
                            value={duracaoPomodoro}
                            disabled={rodando || fasePomodoro !== "foco"}
                            onChange={(e) => { const valor = Number(e.target.value); setDuracaoPomodoro(valor); setSegundos(valor * 60); }}
                        />
                        <div className="duracoes-rapidas" aria-label="Durações rápidas">
                            {[15, 25, 45, 60].map((minutos) => (
                                <button key={minutos} type="button" disabled={rodando || fasePomodoro !== "foco"} className={duracaoPomodoro === minutos ? "selecionada" : ""} onClick={() => { setDuracaoPomodoro(minutos); setSegundos(minutos * 60); }}>
                                    {minutos} min
                                </button>
                            ))}
                        </div>
                    </div>}
                    <div className="relogio-pomodoro" aria-live="polite">{tempoFormatado}</div>
                    {minutosSessaoAtual > 0 && <p className="pausa-pomodoro">Tempo nesta sessão: {minutosSessaoAtual} min</p>}
                    <div className="acoes-pomodoro">
                        {!rodando ? <button className="botao-salvar" type="button" onClick={iniciarPomodoro} disabled={salvando}>{fasePomodoro === "foco" ? "Iniciar foco" : "Iniciar pausa"}</button> : <button className="botao-secundario" type="button" onClick={() => setRodando(false)}>Pausar</button>}
                        <button className="botao-secundario" type="button" disabled={rodando || salvando || fasePomodoro !== "foco" || segundos === duracaoPomodoro * 60} onClick={() => { setFasePomodoro("foco"); setSegundos(duracaoPomodoro * 60); setMinutosSessaoAtual(0); }}>Reiniciar</button>
                    </div>
                    <p className="dica-pomodoro">Ao terminar, o tempo será salvo automaticamente na tarefa selecionada.</p>
                </section>
                <section className="cartao-estudar registro-manual-estudo">
                    <p className="sobretitulo">REGISTRO MANUAL</p><h2>Registrar tempo de estudo</h2><p>Escolha a tarefa e informe quanto tempo estudou.</p>
                    <label htmlFor="tarefa-registro-manual">O que você vai estudar?</label>
                    <select id="tarefa-registro-manual" value={tarefaId} onChange={(evento) => setTarefaId(evento.target.value)}>
                        {tarefas.length === 0 && <option value="">Nenhuma tarefa pendente</option>}
                        {tarefas.map((tarefa) => <option key={tarefa.id} value={tarefa.id}>{tarefa.titulo}</option>)}
                    </select>
                    <label htmlFor="minutos-registro">Quanto tempo você estudou?</label><input id="minutos-registro" type="text" inputMode="text" placeholder="Ex.: 45, 1h ou 1h 20min" value={tempoManual} onChange={(e) => setTempoManual(e.target.value)} aria-describedby="ajuda-tempo-manual" />
                    <small id="ajuda-tempo-manual" className="ajuda-tempo-manual">Digite minutos ou horas e minutos. Ex.: 45 ou 1h 20min.</small>
                    <div className="atalhos-tempo-manual" aria-label="Sugestões rápidas de duração">
                        <span>Sugestões rápidas</span>
                        {[
                            { rotulo: "30 min", valor: "30" },
                            { rotulo: "1h", valor: "1h" },
                            { rotulo: "1h 30min", valor: "1h 30min" },
                            { rotulo: "2h", valor: "2h" }
                        ].map((atalho) => (
                            <button key={atalho.valor} type="button" onClick={() => setTempoManual(atalho.valor)}>
                                {atalho.rotulo}
                            </button>
                        ))}
                    </div>
                    <button className="botao-salvar" type="button" onClick={() => void salvarTempoManual()} disabled={salvando}>Registrar tempo</button>
                    <div className="frase-motivacional-manual" aria-live="polite">
                        <span className="estrela-frase">✦</span>
                        <h3>Um passo de cada vez!</h3>
                        <p>Pequenos progressos também são progressos.</p>
                    </div>
                </section>
            </div>
            <div className="grade-graficos-adicionais">
                <section className="cartao-estudar grafico-adicional">
                    <div className="titulo-secao"><div><h2>Como você estudou</h2><p>Tempo registrado por método no período selecionado.</p></div></div>
                    {tiposGrafico.length === 0 ? <p className="mensagem-vazia">Registre uma sessão para ver essa distribuição.</p> : <div className="barras-adicionais">{tiposGrafico.map((item) => <div className="linha-barra-adicional" key={item.id}><div><strong>{item.label}</strong><span>{formatarTempo(item.segundos)}</span></div><div className="trilho-barra-adicional"><span style={{ width: `${Math.max(3, item.segundos / maxTipoGrafico * 100)}%` }} /></div></div>)}</div>}
                </section>
                <section className="cartao-estudar grafico-adicional">
                    <div className="titulo-secao"><div><h2>Horários mais produtivos</h2><p>Distribuição das sessões pela hora em que começaram.</p></div></div>
                    {Object.values(faixasGrafico).every((valor) => !valor) ? <p className="mensagem-vazia">Registre uma sessão para identificar seus horários.</p> : <div className="barras-adicionais">{["Manhã", "Tarde", "Noite"].map((faixa) => { const segundosFaixa = faixasGrafico[faixa] ?? 0; return <div className="linha-barra-adicional" key={faixa}><div><strong>{faixa}</strong><span>{formatarTempo(segundosFaixa) || "0min"}</span></div><div className="trilho-barra-adicional"><span style={{ width: `${segundosFaixa ? Math.max(3, segundosFaixa / maxFaixaGrafico * 100) : 0}%` }} /></div></div>})}</div>}
                </section>
            </div>
            <details className="cartao-estudar lista-sessoes-dia">
                <summary className="resumo-sessoes-dia">
                    <h2>Sessões de hoje</h2>
                    <span className="contagem-sessoes-dia">{resumo.sessoes.length} {resumo.sessoes.length === 1 ? "sessão" : "sessões"}</span>
                </summary>
                {resumo.sessoes.length === 0 ? <p>Nenhum tempo registrado ainda. Seu primeiro bloco pode começar agora.</p> : resumo.sessoes.map((sessao) => <article key={sessao.id}><div><strong>{sessao.titulo}</strong><span>{new Date(sessao.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {sessao.tipo === "pomodoro" ? "Pomodoro" : sessao.tipo === "planejada" ? "Planejada" : sessao.tipo === "cronometro" ? "Cronômetro livre" : "Manual"}{sessao.atividade ? ` · ${sessao.atividade}` : ""}</span></div><b>{formatarTempo(sessao.duracaoSegundos)}</b></article>)}
            </details>
        </section>
    );
}
