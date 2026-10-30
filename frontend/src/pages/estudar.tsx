import { useEffect, useMemo, useState } from "react";
import { listarTarefas, type Tarefa } from "../services/tarefas";
import { buscarEstudoDoDia, buscarResumoPeriodo, registrarEstudo, type ResumoEstudoDiario, type ResumoPeriodo } from "../services/sessoes-estudo";

function hojeLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Estudar() {
    const FRASES_MOTIVACIONAIS = [
        "Cada minuto de dedicação aproxima você do seu objetivo.",
        "Você não precisa fazer tudo hoje. Só precisa dar o próximo passo.",
        "Pequenos avanços, repetidos com carinho, viram grandes conquistas.",
        "Seu esforço de hoje é um presente para o seu eu do futuro.",
        "Continue no seu ritmo: constância vale mais que pressa.",
        "Aprender leva tempo — e você está investindo bem o seu.",
        "Uma sessão de cada vez. Você está no caminho certo."
    ];
    const [tarefas, setTarefas] = useState<Tarefa[]>([]);
    const [tarefaId, setTarefaId] = useState("");
    const [resumo, setResumo] = useState<ResumoEstudoDiario>({ sessoes: [], totalSegundos: 0 });
    const [duracaoPomodoro, setDuracaoPomodoro] = useState(25);
    const [segundos, setSegundos] = useState(25 * 60);
    const [rodando, setRodando] = useState(false);
    const [cronometroLivreRodando, setCronometroLivreRodando] = useState(false);
    const [segundosLivres, setSegundosLivres] = useState(0);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [tempoManual, setTempoManual] = useState("30");
    const [minutosSessaoAtual, setMinutosSessaoAtual] = useState(0);
    const [indiceFrase, setIndiceFrase] = useState(0);
    const [periodoGrafico, setPeriodoGrafico] = useState<"semana" | "mes">("semana");
    const [resumoPeriodo, setResumoPeriodo] = useState<ResumoPeriodo>({ totalSegundos: 0, dias: [] });

    async function atualizarResumo() {
        setResumo(await buscarEstudoDoDia(hojeLocal()));
        setResumoPeriodo(await buscarResumoPeriodo(periodoGrafico));
    }

    useEffect(() => {
        void Promise.all([listarTarefas(), atualizarResumo()]).then(([lista]) => {
            const pendentes = lista.filter((t) => t.estado !== "concluida");
            setTarefas(pendentes);
            setTarefaId(pendentes[0]?.id ?? "");
        }).catch((falha: unknown) => setErro(falha instanceof Error ? falha.message : "Não foi possível carregar o espaço de estudo."));
    }, []);

    useEffect(() => {
        void buscarResumoPeriodo(periodoGrafico).then(setResumoPeriodo).catch(() => undefined);
    }, [periodoGrafico]);

    useEffect(() => {
        if (!rodando) return;
        const timer = window.setInterval(() => setSegundos((restantes) => {
            if (restantes <= 1) {
                setRodando(false);
                void concluirPomodoro();
                return 0;
            }
            return restantes - 1;
        }), 1000);
        return () => window.clearInterval(timer);
    }, [rodando]);

    useEffect(() => {
        if (!cronometroLivreRodando) return;
        const timer = window.setInterval(() => setSegundosLivres((valor) => valor + 1), 1000);
        return () => window.clearInterval(timer);
    }, [cronometroLivreRodando]);

    const tempoFormatado = useMemo(() => `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`, [segundos]);

    function iniciarPomodoro() {
        if (!tarefaId) { setErro("Cadastre uma tarefa antes de iniciar o cronômetro."); return; }
        setErro("");
        if (segundos === 0) setSegundos(duracaoPomodoro * 60);
        setRodando(true);
    }

    async function concluirPomodoro() {
        if (!tarefaId) return;
        setSalvando(true);
        try {
            await registrarEstudo(tarefaId, duracaoPomodoro * 60, "pomodoro");
            setMinutosSessaoAtual(0);
            await atualizarResumo();
            setSegundos(duracaoPomodoro * 60);
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o tempo estudado.");
        } finally { setSalvando(false); }
    }

    async function salvarTempoManual() {
        if (!tarefaId) { setErro("Selecione uma tarefa primeiro."); return; }
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
    const minutos = Math.floor(resumo.totalSegundos / 60);
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

    return (
        <section className="secao-disciplinas pagina-estudar">
            <header className="cabecalho"><div><p className="sobretitulo">FOCO NO SEU RITMO</p><h1>Hora de estudar <span>✦</span></h1><p className="subtitulo">Use o Pomodoro, cronometre livremente ou registre seu tempo de estudo.</p></div></header>
            {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
            {sucesso && <p className="aviso-planejamento" role="status">{sucesso}</p>}
            <section className="cartao-estudar resumo-estudo-dia">
                <div className="icone-resumo-estudo">◷</div><div><span>Seu tempo de estudo hoje</span><strong>{horas}h {minutos.toString().padStart(2, "0")}min {segundosHoje.toString().padStart(2, "0")}s</strong></div>
                <small>{resumo.sessoes.length} {resumo.sessoes.length === 1 ? "sessão registrada" : "sessões registradas"}</small>
            </section>
            <section className="cartao-estudar painel-produtividade">
                <div className="cabecalho-grafico"><div><p className="sobretitulo">SEU PROGRESSO</p><h2>Tempo dedicado</h2></div><div className="controles-grafico"><div className="seletor-periodo-grafico"><button type="button" className={periodoGrafico === "semana" ? "ativo" : ""} onClick={() => setPeriodoGrafico("semana")}>7 dias</button><button type="button" className={periodoGrafico === "mes" ? "ativo" : ""} onClick={() => setPeriodoGrafico("mes")}>Este mês</button></div></div></div>
                <strong className="total-periodo-estudo">{formatarTempo(resumoPeriodo.totalSegundos) || "0min"}</strong>
                <div className="grafico-com-escala" role="img" aria-label="Gráfico do tempo estudado por dia, com escala em horas">
                <div className="escala-grafico-horas">
                    {Array.from({ length: Math.max(4, Math.ceil(Math.max(...resumoPeriodo.dias.map((dia) => dia.totalSegundos), 0) / 3600)) + 1 }, (_, hora) => <span key={hora} style={{ bottom: `${(hora / Math.max(4, Math.ceil(Math.max(...resumoPeriodo.dias.map((dia) => dia.totalSegundos), 0) / 3600))) * 100}%` }}>{hora === 0 ? "0" : `${hora}h`}</span>)}
                </div>
                <div className="grafico-estudo" role="presentation">
                    {resumoPeriodo.dias.map((dia) => {
                        const maxHoras = Math.max(4, Math.ceil(Math.max(...resumoPeriodo.dias.map((item) => item.totalSegundos), 0) / 3600));
                        const altura = (dia.totalSegundos / (maxHoras * 3600)) * 100;
                        return <div className="coluna-grafico-estudo" key={dia.data} title={`${rotuloDia(dia.data)}: ${formatarTempo(dia.totalSegundos) || "0s"}`}><div className="trilho-grafico"><span style={{ height: `${altura}%` }} /></div><small>{periodoGrafico === "semana" ? new Date(`${dia.data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") : rotuloDia(dia.data)}</small></div>;
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
                        {!cronometroLivreRodando ? <button className="botao-salvar" type="button" disabled={salvando || rodando || !tarefaId} onClick={() => { setErro(""); setCronometroLivreRodando(true); }}>Iniciar</button> : <button className="botao-secundario" type="button" onClick={() => setCronometroLivreRodando(false)}>Pausar</button>}
                        {!cronometroLivreRodando && segundosLivres > 0 && <button className="botao-salvar" type="button" disabled={salvando || rodando} onClick={() => setCronometroLivreRodando(true)}>Continuar</button>}
                        {!cronometroLivreRodando && segundosLivres > 0 && <button className="botao-secundario" type="button" disabled={salvando} onClick={() => void encerrarCronometroLivre()}>{salvando ? "Salvando sessão..." : "Encerrar e salvar"}</button>}
                        {!cronometroLivreRodando && segundosLivres === 0 && <button className="botao-secundario" type="button" disabled={salvando || rodando} onClick={() => setSegundosLivres(0)}>Zerar</button>}
                    </div>
                    <p className="dica-pomodoro">Pause quando quiser. Ao encerrar, o tempo será somado à tarefa e ao total de hoje.</p>
                </section>
                <section className="cartao-estudar pomodoro-estudar">
                    <p className="sobretitulo">TÉCNICA POMODORO</p><h2>Um bloco de foco por vez</h2>
                    <label htmlFor="tarefa-pomodoro">O que você vai estudar?</label>
                    <select id="tarefa-pomodoro" value={tarefaId} onChange={(e) => setTarefaId(e.target.value)}>
                        {tarefas.length === 0 && <option value="">Nenhuma tarefa pendente</option>}
                        {tarefas.map((tarefa) => <option key={tarefa.id} value={tarefa.id}>{tarefa.titulo}</option>)}
                    </select>
                    <label htmlFor="duracao-pomodoro">Duração do foco</label>
                    <div className="duracao-interativa">
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
                            disabled={rodando}
                            onChange={(e) => { const valor = Number(e.target.value); setDuracaoPomodoro(valor); setSegundos(valor * 60); }}
                        />
                        <div className="duracoes-rapidas" aria-label="Durações rápidas">
                            {[15, 25, 45, 60].map((minutos) => (
                                <button key={minutos} type="button" disabled={rodando} className={duracaoPomodoro === minutos ? "selecionada" : ""} onClick={() => { setDuracaoPomodoro(minutos); setSegundos(minutos * 60); }}>
                                    {minutos} min
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relogio-pomodoro" aria-live="polite">{tempoFormatado}</div>
                    {minutosSessaoAtual > 0 && <p className="pausa-pomodoro">Tempo nesta sessão: {minutosSessaoAtual} min</p>}
                    <div className="acoes-pomodoro">
                        {!rodando ? <button className="botao-salvar" type="button" onClick={iniciarPomodoro} disabled={salvando}>Iniciar foco</button> : <button className="botao-secundario" type="button" onClick={() => setRodando(false)}>Pausar</button>}
                        <button className="botao-secundario" type="button" disabled={rodando || salvando || segundos === duracaoPomodoro * 60} onClick={() => { setSegundos(duracaoPomodoro * 60); setMinutosSessaoAtual(0); }}>Reiniciar</button>
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
                    <button className="botao-salvar" type="button" onClick={() => void salvarTempoManual()} disabled={salvando || !tarefaId}>Registrar tempo</button>
                    <div className="frase-motivacional-manual" aria-live="polite">
                        <span className="estrela-frase">✦</span>
                        <p>“{FRASES_MOTIVACIONAIS[indiceFrase]}”</p>
                        <button type="button" onClick={() => setIndiceFrase((indiceFrase + 1) % FRASES_MOTIVACIONAIS.length)}>
                            Nova frase
                        </button>
                    </div>
                </section>
            </div>
            <section className="cartao-estudar lista-sessoes-dia"><h2>Sessões de hoje</h2>{resumo.sessoes.length === 0 ? <p>Nenhum tempo registrado ainda. Seu primeiro bloco pode começar agora.</p> : resumo.sessoes.map((sessao) => <article key={sessao.id}><div><strong>{sessao.titulo}</strong><span>{new Date(sessao.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {sessao.tipo === "pomodoro" ? "Pomodoro" : sessao.tipo === "planejada" ? "Planejada" : sessao.tipo === "cronometro" ? "Cronômetro livre" : "Manual"}{sessao.atividade ? ` · ${sessao.atividade}` : ""}</span></div><b>{formatarTempo(sessao.duracaoSegundos)}</b></article>)}</section>
        </section>
    );
}
