import { useEffect, useState } from "react";

interface Lembrete { id: string; hora: string }

function lerLembretesSalvos(): Lembrete[] {
    const salvos = localStorage.getItem("studyflow_lembretes");
    if (salvos) {
        try {
            const itens = JSON.parse(salvos) as Lembrete[];
            const validos = itens.filter((item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item.hora));
            if (validos.length > 0) return validos;
        } catch { /* Migra o lembrete único anterior se o formato salvo estiver inválido. */ }
    }
    const legado = localStorage.getItem("studyflow_lembrete_horario") || "18:00";
    return [{ id: `lembrete-${legado}`, hora: legado }];
}

export default function Configuracoes() {
    const [tema, setTema] = useState<"claro" | "escuro">(() =>
        localStorage.getItem("studyflow_tema") === "escuro" ? "escuro" : "claro"
    );
    const [duracaoPomodoro, setDuracaoPomodoro] = useState(() => {
        const salva = Number(localStorage.getItem("studyflow_duracao_pomodoro"));
        return Number.isInteger(salva) && salva >= 5 && salva <= 180 ? salva : 25;
    });
    const [duracaoPausa, setDuracaoPausa] = useState(() => Number(localStorage.getItem("studyflow_pausa_minutos")) || 5);
    const [duracaoPausaLonga, setDuracaoPausaLonga] = useState(() => Number(localStorage.getItem("studyflow_pausa_longa_minutos")) || 15);
    const [intervaloPausaLonga, setIntervaloPausaLonga] = useState(() => Number(localStorage.getItem("studyflow_intervalo_pausa_longa")) || 4);
    const [lembreteAtivo, setLembreteAtivo] = useState(() => localStorage.getItem("studyflow_lembrete_ativo") === "true");
    const [lembretes, setLembretes] = useState<Lembrete[]>(lerLembretesSalvos);
    const [novoHorarioLembrete, setNovoHorarioLembrete] = useState("18:00");
    const [mensagemLembrete, setMensagemLembrete] = useState("");
    const [inicioSemana, setInicioSemana] = useState(() => localStorage.getItem("studyflow_inicio_semana") === "segunda" ? "segunda" : "domingo");
    const [estrategiaPadrao, setEstrategiaPadrao] = useState(() => localStorage.getItem("studyflow_estrategia_padrao") || "combinada");
    const [incluirFuturas, setIncluirFuturas] = useState(() => localStorage.getItem("studyflow_incluir_futuras") !== "false");
    const [textoGrande, setTextoGrande] = useState(() => localStorage.getItem("studyflow_texto_grande") === "true");
    const [reduzirAnimacoes, setReduzirAnimacoes] = useState(() => localStorage.getItem("studyflow_reduzir_animacoes") === "true");
    const [permissaoNotificacao, setPermissaoNotificacao] = useState(() => typeof Notification === "undefined" ? "indisponivel" : Notification.permission);

    useEffect(() => {
        document.documentElement.dataset.theme = tema;
        localStorage.setItem("studyflow_tema", tema);
    }, [tema]);

    useEffect(() => {
        localStorage.setItem("studyflow_duracao_pomodoro", String(duracaoPomodoro));
    }, [duracaoPomodoro]);

    useEffect(() => {
        localStorage.setItem("studyflow_pausa_minutos", String(duracaoPausa));
        localStorage.setItem("studyflow_pausa_longa_minutos", String(duracaoPausaLonga));
        localStorage.setItem("studyflow_intervalo_pausa_longa", String(intervaloPausaLonga));
    }, [duracaoPausa, duracaoPausaLonga, intervaloPausaLonga]);

    useEffect(() => {
        localStorage.setItem("studyflow_inicio_semana", inicioSemana);
        localStorage.setItem("studyflow_estrategia_padrao", estrategiaPadrao);
        localStorage.setItem("studyflow_incluir_futuras", String(incluirFuturas));
    }, [inicioSemana, estrategiaPadrao, incluirFuturas]);

    useEffect(() => {
        document.documentElement.dataset.texto = textoGrande ? "grande" : "normal";
        document.documentElement.dataset.animacoes = reduzirAnimacoes ? "reduzidas" : "normais";
        localStorage.setItem("studyflow_texto_grande", String(textoGrande));
        localStorage.setItem("studyflow_reduzir_animacoes", String(reduzirAnimacoes));
    }, [textoGrande, reduzirAnimacoes]);

    useEffect(() => {
        localStorage.setItem("studyflow_lembrete_ativo", String(lembreteAtivo));
        localStorage.setItem("studyflow_lembretes", JSON.stringify(lembretes));
    }, [lembreteAtivo, lembretes]);

    async function alternarLembrete() {
        setMensagemLembrete("");
        if (lembreteAtivo) {
            setLembreteAtivo(false);
            setMensagemLembrete("Lembrete diário desativado.");
            return;
        }
        if (lembretes.length === 0) {
            setMensagemLembrete("Adicione pelo menos um horário antes de ativar os lembretes.");
            return;
        }
        if (!("Notification" in window)) {
            setMensagemLembrete("Este navegador não oferece suporte a notificações.");
            return;
        }
        const permissao = Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        setPermissaoNotificacao(permissao);
        if (permissao !== "granted") {
            setMensagemLembrete("Permita as notificações do StudyFlow no navegador para ativar o lembrete.");
            return;
        }
        setLembreteAtivo(true);
        setMensagemLembrete("Lembretes ativados. Eles avisam nos horários escolhidos enquanto o StudyFlow estiver aberto.");
    }

    function adicionarLembrete() {
        setMensagemLembrete("");
        if (lembretes.some((lembrete) => lembrete.hora === novoHorarioLembrete)) {
            setMensagemLembrete("Já existe um lembrete nesse horário.");
            return;
        }
        setLembretes((atuais) => [...atuais, { id: `lembrete-${Date.now()}`, hora: novoHorarioLembrete }].sort((a, b) => a.hora.localeCompare(b.hora)));
        setMensagemLembrete("Horário adicionado.");
    }

    async function permitirNotificacoes() {
        if (!("Notification" in window)) {
            setMensagemLembrete("Este navegador não oferece suporte a notificações.");
            return;
        }
        const permissao = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        setPermissaoNotificacao(permissao);
        setMensagemLembrete(permissao === "granted"
            ? "Permissão concedida. O StudyFlow também poderá avisar quando um foco ou uma pausa terminar."
            : "Permita as notificações do StudyFlow nas configurações do navegador.");
    }

    function testarNotificacao() {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        new Notification("StudyFlow", { body: "As notificações estão funcionando!", icon: "/logo-studyflow.png" });
    }

    return (
        <section className="secao-disciplinas pagina-configuracoes">
            <header className="cabecalho">
                <div>
                    <p className="sobretitulo">PREFERÊNCIAS DO APLICATIVO</p>
                    <h1>Configurações</h1>
                    <p className="subtitulo">Ajuste a aparência e o ritmo das suas sessões de foco.</p>
                </div>
            </header>

            <div className="configuracoes-lembrete-acessibilidade">
            <section className="cartao-configuracoes">
                <div className="titulo-secao"><div><h2>Lembrete diário</h2><p>Receba um aviso para lembrar de estudar no horário escolhido.</p></div></div>
                <div className="preferencia-lembrete">
                    <label htmlFor="horario-lembrete">Adicionar horário</label>
                    <div className="adicionar-horario-lembrete">
                        <input id="horario-lembrete" type="time" value={novoHorarioLembrete} onChange={(evento) => setNovoHorarioLembrete(evento.target.value)} />
                        <button type="button" className="botao-secundario" onClick={adicionarLembrete}>+ Adicionar horário</button>
                    </div>
                    <ul className="lista-horarios-lembrete" aria-label="Horários de lembrete">
                        {lembretes.map((lembrete) => <li key={lembrete.id}><span>◷ {lembrete.hora}</span><button type="button" aria-label={`Remover lembrete das ${lembrete.hora}`} onClick={() => { setLembretes((atuais) => atuais.filter((item) => item.id !== lembrete.id)); if (lembretes.length === 1) setLembreteAtivo(false); }}>Remover</button></li>)}
                        {lembretes.length === 0 && <li className="sem-lembretes">Nenhum horário adicionado.</li>}
                    </ul>
                    <div className="acoes-lembrete">
                        <button type="button" className="botao-salvar" onClick={() => void alternarLembrete()}>{lembreteAtivo ? "Desativar lembrete" : "Ativar lembrete"}</button>
                        {permissaoNotificacao !== "granted" && <button type="button" className="botao-secundario" onClick={() => void permitirNotificacoes()}>Permitir notificações</button>}
                        {permissaoNotificacao === "granted" && <button type="button" className="botao-secundario" onClick={testarNotificacao}>Enviar teste</button>}
                        <span className={lembreteAtivo ? "estado-lembrete ativo" : "estado-lembrete"}>{lembreteAtivo ? "Ativo" : "Desativado"}</span>
                    </div>
                    <p className="descricao-preferencia">Os lembretes e avisos de fim do Pomodoro precisam de permissão do navegador. Eles funcionam enquanto o StudyFlow estiver aberto.</p>
                    {mensagemLembrete && <p className="mensagem-configuracao" role="status">{mensagemLembrete}</p>}
                </div>
            </section>

            <div className="coluna-aparencia-acessibilidade">
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
                <div className="titulo-secao"><div><h2>Acessibilidade</h2><p>Ajustes visuais aplicados em todas as telas.</p></div></div>
                <div className="preferencias-acessibilidade">
                    <label className="opcao-chave-config"><input type="checkbox" checked={textoGrande} onChange={(evento) => setTextoGrande(evento.target.checked)} /> Aumentar o tamanho dos textos</label>
                    <label className="opcao-chave-config"><input type="checkbox" checked={reduzirAnimacoes} onChange={(evento) => setReduzirAnimacoes(evento.target.checked)} /> Reduzir animações e transições</label>
                </div>
            </section>
            </div>
            </div>

            <section className="cartao-configuracoes">
                <div className="titulo-secao"><div><h2>Preferências do planejamento</h2><p>Defina as opções iniciais usadas ao gerar um plano novo.</p></div></div>
                <div className="preferencias-planejamento-config">
                    <label>Estratégia padrão
                        <select value={estrategiaPadrao} onChange={(evento) => setEstrategiaPadrao(evento.target.value)}>
                            <option value="combinada">Equilibrada</option><option value="urgencia">Prazo mais próximo</option><option value="dificuldade">Maior dificuldade</option><option value="peso">Maior peso</option>
                        </select>
                    </label>
                    <label className="opcao-chave-config"><input type="checkbox" checked={incluirFuturas} onChange={(evento) => setIncluirFuturas(evento.target.checked)} /> Incluir tarefas futuras para adiantar ao gerar o plano</label>
                    <label>Início da semana
                        <select value={inicioSemana} onChange={(evento) => setInicioSemana(evento.target.value)}>
                            <option value="domingo">Domingo</option><option value="segunda">Segunda-feira</option>
                        </select>
                    </label>
                </div>
            </section>

            <div className="configuracoes-pomodoro">
            <section className="cartao-configuracoes">
                <div className="titulo-secao">
                    <div>
                        <h2>Duração padrão do Pomodoro</h2>
                        <p>Escolha o tempo inicial dos seus blocos de foco. Você ainda pode ajustá-lo antes de começar.</p>
                    </div>
                </div>
                <div className="preferencia-pomodoro">
                    <div className="duracao-valor"><strong>{duracaoPomodoro}</strong><span>minutos</span></div>
                    <input type="range" min={5} max={180} step={5} value={duracaoPomodoro} aria-label="Duração padrão do Pomodoro em minutos" onChange={(evento) => setDuracaoPomodoro(Number(evento.target.value))} />
                    <div className="duracoes-rapidas">
                        {[15, 25, 45, 60].map((minutos) => (
                            <button key={minutos} type="button" className={duracaoPomodoro === minutos ? "selecionada" : ""} onClick={() => setDuracaoPomodoro(minutos)}>{minutos} min</button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="cartao-configuracoes">
                <div className="titulo-secao"><div><h2>Pausas do Pomodoro</h2><p>A pausa curta vem após cada foco; a longa entra no intervalo configurado.</p></div></div>
                <div className="preferencias-pausas">
                    <label>Pausa curta
                        <select value={duracaoPausa} onChange={(evento) => setDuracaoPausa(Number(evento.target.value))}>
                            {[3, 5, 10, 15].map((min) => <option value={min} key={min}>{min} minutos</option>)}
                        </select>
                    </label>
                    <label>Pausa longa
                        <select value={duracaoPausaLonga} onChange={(evento) => setDuracaoPausaLonga(Number(evento.target.value))}>
                            {[10, 15, 20, 30].map((min) => <option value={min} key={min}>{min} minutos</option>)}
                        </select>
                    </label>
                    <label>Intervalo da pausa longa
                        <select value={intervaloPausaLonga} onChange={(evento) => setIntervaloPausaLonga(Number(evento.target.value))}>
                            {[2, 3, 4, 5, 6].map((blocos) => <option value={blocos} key={blocos}>A cada {blocos} focos</option>)}
                        </select>
                    </label>
                </div>
            </section>
            </div>
        </section>
    );
}
