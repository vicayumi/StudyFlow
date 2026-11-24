import { Request, Response } from "express";
import { GeradorPlanejamento } from "../../application/services/gerador-planejamento.js";
import { EstrategiaCombinada } from "../../domain/strategies/estrategia-combinada.js";
import { EstrategiaUrgencia } from "../../domain/strategies/estrategia-urgencia.js";
import { EstrategiaDificuldade } from "../../domain/strategies/estrategia-dificuldade.js";
import { EstrategiaPeso } from "../../domain/strategies/estrategia-peso.js";
import type { EstrategiaPrioridade } from "../../domain/interfaces/estrategia-prioridade.js";
import { Tarefa } from "../../domain/entities/tarefa.js";
import { RepositorioHorarios, type DadosHorarioDisponivel } from "../../infrastructure/database/repositorio-horarios.js";
import { RepositorioTarefas } from "../../infrastructure/database/repositorio-tarefas.js";
import { RepositorioPlanos } from "../../infrastructure/database/repositorio-planos.js";
import { RepositorioSessoesEstudo } from "../../infrastructure/database/repositorio-sessoes-estudo.js";
import type { TarefaComDisciplina } from "../../infrastructure/database/repositorio-tarefas.js";

const DIAS_DA_SEMANA = 7;

export class ControladorPlanejamento {
    private readonly repositorioHorarios = new RepositorioHorarios();
    private readonly repositorioTarefas = new RepositorioTarefas();
    private readonly repositorioPlanos = new RepositorioPlanos();
    private readonly repositorioSessoes = new RepositorioSessoesEstudo();

    public listarEstrategias = (_requisicao: Request, resposta: Response): void => {
        resposta.json([
            { id: "combinada", nome: "Equilibrada", descricao: "Combina prazo, dificuldade e peso da avaliação." },
            { id: "urgencia", nome: "Prazo mais próximo", descricao: "Prioriza atividades com prazo mais próximo." },
            { id: "dificuldade", nome: "Maior dificuldade", descricao: "Prioriza atividades mais difíceis." },
            { id: "peso", nome: "Maior peso", descricao: "Prioriza atividades com maior peso na avaliação." }
        ]);
    };

    public buscarSemanaSalva = async (requisicao: Request, resposta: Response): Promise<void> => {
        const dataInicio = this.lerDataInicio(requisicao.query.dataInicio);
        if ("erro" in dataInicio) {
            resposta.status(400).json({ erro: dataInicio.erro });
            return;
        }
        try {
            const chave = this.formatarDataLocal(dataInicio.data);
            const [plano, concluidas, tarefas] = await Promise.all([
                this.repositorioPlanos.buscarSemana(chave, requisicao.usuarioId!),
                this.repositorioSessoes.listarIdsPlanejadosConcluidos(requisicao.usuarioId!),
                this.repositorioTarefas.listarTodas(requisicao.usuarioId!)
            ]);
            if (!plano) {
                resposta.status(404).json({ erro: "Ainda não há um plano salvo para essa semana." });
                return;
            }
            const idsConcluidos = new Set(concluidas);
            const tarefasPendentes = new Set(tarefas.filter((tarefa) => tarefa.estado !== "concluida").map((tarefa) => tarefa.id));
            resposta.json({
                ...plano,
                sessoes: plano.sessoes
                    .filter((sessao) => tarefasPendentes.has(sessao.tarefaId) && !idsConcluidos.has(sessao.id))
                    .map((sessao) => ({ ...sessao, concluida: false })),
                prioridades: plano.prioridades.filter((prioridade) => tarefasPendentes.has(prioridade.tarefaId)),
                tarefasSemTempo: plano.tarefasSemTempo.filter((tarefa) => tarefasPendentes.has(tarefa.id))
            });
        } catch (erro) {
            console.error("Erro ao carregar plano salvo:", erro);
            resposta.status(500).json({ erro: "Não foi possível carregar o plano salvo." });
        }
    };

    public listarCalendario = async (requisicao: Request, resposta: Response): Promise<void> => {
        const ano = Number(requisicao.query.ano);
        const mes = Number(requisicao.query.mes);
        if (!Number.isInteger(ano) || ano < 2000 || ano > 9999 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
            resposta.status(400).json({ erro: "Informe um ano e mês válidos para carregar o calendário." });
            return;
        }
        try {
            const [sessoes, concluidas, tarefas] = await Promise.all([
                this.repositorioPlanos.listarSessoesDoMes(ano, mes, requisicao.usuarioId!),
                this.repositorioSessoes.listarIdsPlanejadosConcluidos(requisicao.usuarioId!),
                this.repositorioTarefas.listarTodas(requisicao.usuarioId!)
            ]);
            const idsConcluidos = new Set(concluidas);
            const tarefasPendentes = new Set(tarefas.filter((tarefa) => tarefa.estado !== "concluida").map((tarefa) => tarefa.id));
            resposta.json(sessoes
                .filter((sessao) => tarefasPendentes.has(sessao.tarefaId) && !idsConcluidos.has(sessao.id))
                .map((sessao) => ({ ...sessao, concluida: false })));
        } catch (erro) {
            console.error("Erro ao carregar sessões do calendário:", erro);
            resposta.status(500).json({ erro: "Não foi possível carregar os planos salvos." });
        }
    };

    public listarHistorico = async (requisicao: Request, resposta: Response): Promise<void> => {
        try { resposta.json(await this.repositorioPlanos.listarHistorico(requisicao.usuarioId!)); }
        catch (erro) {
            console.error("Erro ao listar histórico de planejamentos:", erro);
            resposta.status(500).json({ erro: "Não foi possível carregar o histórico." });
        }
    };

    public resumoEstimativas = async (requisicao: Request, resposta: Response): Promise<void> => {
        try {
            const tarefas = await this.repositorioTarefas.listarTodas(requisicao.usuarioId!);
            resposta.json(this.calcularAjusteEstimativa(tarefas));
        } catch (erro) {
            console.error("Erro ao calcular estimativas adaptativas:", erro);
            resposta.status(500).json({ erro: "Não foi possível analisar o histórico de estudo." });
        }
    };

    public buscarHistorico = async (requisicao: Request, resposta: Response): Promise<void> => {
        const id = this.obterId(requisicao);
        if (!id) { resposta.status(400).json({ erro: "O identificador do planejamento é inválido." }); return; }
        try {
            const plano = await this.repositorioPlanos.buscarHistorico(id, requisicao.usuarioId!);
            if (!plano) { resposta.status(404).json({ erro: "Planejamento não encontrado no histórico." }); return; }
            const concluidas = new Set(await this.repositorioSessoes.listarIdsPlanejadosConcluidos(requisicao.usuarioId!));
            resposta.json({ ...plano, sessoes: plano.sessoes.map((sessao) => ({ ...sessao, concluida: concluidas.has(sessao.id) })) });
        } catch (erro) {
            console.error("Erro ao abrir planejamento histórico:", erro);
            resposta.status(500).json({ erro: "Não foi possível abrir esse planejamento." });
        }
    };

    public excluirHistorico = async (requisicao: Request, resposta: Response): Promise<void> => {
        const ids = requisicao.body?.ids;
        if (ids !== undefined && (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || ids.some((id: unknown) => typeof id !== "string" || !id.trim() || id.length > 100))) {
            resposta.status(400).json({ erro: "Selecione até 50 planejamentos válidos para excluir." });
            return;
        }
        try {
            await this.repositorioPlanos.excluirHistorico(requisicao.usuarioId!, ids as string[] | undefined);
            resposta.status(204).send();
        } catch (erro) {
            console.error("Erro ao excluir histórico de planejamentos:", erro);
            resposta.status(500).json({ erro: "Não foi possível excluir o histórico." });
        }
    };

    public moverSessaoCalendario = async (requisicao: Request, resposta: Response): Promise<void> => {
        const id = this.obterId(requisicao);
        const { data, hora } = requisicao.body ?? {};
        if (!id || typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data) || typeof hora !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
            resposta.status(400).json({ erro: "Informe uma data e um horário válidos para mover a sessão." }); return;
        }
        const inicio = new Date(`${data}T${hora}:00`);
        const [ano, mes, dia] = data.split("-").map(Number);
        if (inicio.getFullYear() !== ano || inicio.getMonth() !== mes - 1 || inicio.getDate() !== dia) {
            resposta.status(400).json({ erro: "A data escolhida não é válida." }); return;
        }
        if (inicio.getTime() < Date.now()) {
            resposta.status(400).json({ erro: "Escolha um horário futuro para reagendar a sessão." }); return;
        }
        try {
            if ((await this.repositorioSessoes.listarIdsPlanejadosConcluidos(requisicao.usuarioId!)).includes(id)) {
                resposta.status(409).json({ erro: "Sessões concluídas não podem ser movidas." }); return;
            }
            const horarios = await this.repositorioHorarios.listar(requisicao.usuarioId!);
            const sessao = await this.repositorioPlanos.moverSessao(id, inicio, horarios, requisicao.usuarioId!);
            if (!sessao) { resposta.status(404).json({ erro: "Sessão planejada não encontrada." }); return; }
            resposta.json(sessao);
        } catch (erro) {
            const mensagem = erro instanceof Error ? erro.message : "";
            const conflito = mensagem.startsWith("Escolha um horário") || mensagem.startsWith("Esse horário se sobrepõe");
            if (!conflito) console.error("Erro ao mover sessão no calendário:", erro);
            resposta.status(conflito ? 409 : 500).json({ erro: conflito ? mensagem : "Não foi possível mover a sessão." });
        }
    };

    public resumoPlanejado = async (requisicao: Request, resposta: Response): Promise<void> => {
        const periodo = requisicao.query.periodo;
        if (periodo !== "hoje" && periodo !== "semana" && periodo !== "mes") {
            resposta.status(400).json({ erro: "Selecione um período válido para comparar o planejamento." });
            return;
        }
        try {
            resposta.json(await this.repositorioPlanos.resumoPlanejado(periodo, requisicao.usuarioId!));
        } catch (erro) {
            console.error("Erro ao carregar o resumo de tempo planejado:", erro);
            resposta.status(500).json({ erro: "Não foi possível carregar o tempo planejado." });
        }
    };

    public listarHorarios = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        try {
            resposta.json(await this.repositorioHorarios.listar(requisicao.usuarioId!));
        } catch (erro) {
            console.error("Erro ao listar horários disponíveis:", erro);
            resposta.status(500).json({
                erro: "Não foi possível carregar os horários disponíveis."
            });
        }
    };

    public criarHorario = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        const validacao = this.validarHorario(requisicao.body);

        if ("erro" in validacao) {
            resposta.status(400).json({ erro: validacao.erro });
            return;
        }

        try {
            if (await this.temConflito(validacao.dados, requisicao.usuarioId!)) {
                resposta.status(409).json({
                    erro: "Esse horário se sobrepõe a outro intervalo do mesmo dia."
                });
                return;
            }

            resposta.status(201).json(
                await this.repositorioHorarios.criar(validacao.dados, requisicao.usuarioId!)
            );
        } catch (erro) {
            console.error("Erro ao criar horário disponível:", erro);
            resposta.status(500).json({
                erro: "Não foi possível salvar o horário disponível."
            });
        }
    };

    public atualizarHorario = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        const id = this.obterId(requisicao);

        if (!id) {
            resposta.status(400).json({ erro: "O identificador do horário é inválido." });
            return;
        }

        const validacao = this.validarHorario(requisicao.body);

        if ("erro" in validacao) {
            resposta.status(400).json({ erro: validacao.erro });
            return;
        }

        try {
            if (await this.temConflito(validacao.dados, requisicao.usuarioId!, id)) {
                resposta.status(409).json({
                    erro: "Esse horário se sobrepõe a outro intervalo do mesmo dia."
                });
                return;
            }

            const atualizado = await this.repositorioHorarios.atualizar(
                id,
                validacao.dados,
                requisicao.usuarioId!
            );

            if (!atualizado) {
                resposta.status(404).json({
                    erro: "Horário disponível não encontrado."
                });
                return;
            }

            resposta.json(atualizado);
        } catch (erro) {
            console.error("Erro ao atualizar horário disponível:", erro);
            resposta.status(500).json({
                erro: "Não foi possível atualizar o horário disponível."
            });
        }
    };

    public excluirHorario = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        const id = this.obterId(requisicao);

        if (!id) {
            resposta.status(400).json({ erro: "O identificador do horário é inválido." });
            return;
        }

        try {
            const excluido = await this.repositorioHorarios.excluir(
                id,
                requisicao.usuarioId!
            );

            if (!excluido) {
                resposta.status(404).json({
                    erro: "Horário disponível não encontrado."
                });
                return;
            }

            resposta.status(204).send();
        } catch (erro) {
            console.error("Erro ao excluir horário disponível:", erro);
            resposta.status(500).json({
                erro: "Não foi possível excluir o horário disponível."
            });
        }
    };

    public gerarPlano = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        const dataInicio = this.lerDataInicio(
            requisicao.body?.dataInicio
        );

        if ("erro" in dataInicio) {
            resposta.status(400).json({ erro: dataInicio.erro });
            return;
        }

        const estrategiaId = requisicao.body?.estrategia ?? "combinada";
        const estrategia = this.criarEstrategia(estrategiaId);
        if (!estrategia) {
            resposta.status(400).json({ erro: "Selecione uma estratégia de prioridade válida." });
            return;
        }
        const incluirTarefasFuturas = requisicao.body?.incluirTarefasFuturas !== false;

        try {
            const chaveSemana = this.formatarDataLocal(dataInicio.data);
            const [horarios, tarefasSalvas] = await Promise.all([
                this.repositorioHorarios.listar(requisicao.usuarioId!),
                this.repositorioTarefas.listarTodas(requisicao.usuarioId!)
            ]);
            const ajusteEstimativa = this.calcularAjusteEstimativa(tarefasSalvas);
            const tarefas = tarefasSalvas.map((dados) => {
                const duracaoParaPlanejar = dados.estado === "concluida"
                    ? dados.duracaoEstimada
                    : Math.max(1, Math.round(dados.duracaoEstimada * ajusteEstimativa.fator));
                const tarefa = new Tarefa(
                    dados.id,
                    dados.titulo,
                    dados.descricao,
                    new Date(dados.dataPrazo),
                    dados.dificuldade,
                    duracaoParaPlanejar,
                    dados.pesoAvaliacao
                );

                if (dados.tempoEstudado > 0) {
                    tarefa.registrarTempoEstudado(dados.tempoEstudado);
                }

                if (dados.estado === "concluida") {
                    tarefa.concluir();
                }

                return tarefa;
            });
            const intervalos = this.criarIntervalosDaSemana(
                horarios,
                dataInicio.data
            );
            const dataAtual = new Date();
            const fimSemana = new Date(dataInicio.data);
            fimSemana.setDate(fimSemana.getDate() + DIAS_DA_SEMANA - 1);
            fimSemana.setHours(23, 59, 59, 999);
            const tarefasDoPlano = incluirTarefasFuturas
                ? tarefas
                : tarefas.filter((tarefa) => tarefa.dataPrazo <= fimSemana);
            const gerador = new GeradorPlanejamento(estrategia.instancia);
            const resultado = gerador.gerar(
                tarefasDoPlano,
                intervalos,
                dataAtual
            );
            const titulosPorId = new Map(
                tarefas.map((tarefa) => [tarefa.id, tarefa.titulo])
            );
            const prioridadesPorId = new Map(resultado.prioridades.map((item) => [item.tarefaId, item]));
            const prioridades = resultado.prioridades.map((item) => ({
                ...item,
                titulo: titulosPorId.get(item.tarefaId) ?? "Tarefa"
            }));
            const sessoesNovas = resultado.sessoes
                .map((sessao) => {
                    const prioridade = prioridadesPorId.get(sessao.tarefaId);
                    return {
                        id: sessao.id,
                        tarefaId: sessao.tarefaId,
                        titulo: titulosPorId.get(sessao.tarefaId) ?? "Tarefa",
                        inicio: sessao.inicio.toISOString(),
                        fim: sessao.fim.toISOString(),
                        duracaoMinutos: sessao.obterDuracao(),
                        prioridade: prioridade?.prioridade ?? 0,
                        explicacaoPrioridade: prioridade?.explicacao ?? ""
                    };
                })
                .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
            const sessoes = sessoesNovas;
            const tarefasSemTempo = resultado.tarefasSemTempo.map((id) => {
                const tarefa = tarefas.find((item) => item.id === id);
                const atrasoMs = tarefa ? dataAtual.getTime() - tarefa.dataPrazo.getTime() : 0;
                return {
                    id,
                    titulo: titulosPorId.get(id) ?? "Tarefa",
                    ...(atrasoMs > 0 ? { diasAtraso: Math.max(1, Math.ceil(atrasoMs / 86400000)) } : {})
                };
            });
            const dadosPlano = {
                dataInicio: chaveSemana,
                estrategia: estrategia.id,
                sessoes,
                prioridades,
                tarefasSemTempo,
                ajusteEstimativa
            };
            await this.repositorioPlanos.salvar(dadosPlano, requisicao.usuarioId!);

            resposta.json(dadosPlano);
        } catch (erro) {
            console.error("Erro ao gerar plano de estudos:", erro);
            resposta.status(500).json({
                erro: "Não foi possível gerar o plano de estudos."
            });
        }
    };

    private validarHorario(
        corpo: unknown
    ): { dados: DadosHorarioDisponivel } | { erro: string } {
        if (!corpo || typeof corpo !== "object") {
            return { erro: "Informe o dia e o intervalo de estudo." };
        }

        const dados = corpo as Record<string, unknown>;
        const { diaSemana, horaInicio, horaFim } = dados;

        if (
            typeof diaSemana !== "number" ||
            !Number.isInteger(diaSemana) ||
            diaSemana < 0 ||
            diaSemana > 6
        ) {
            return { erro: "Selecione um dia da semana válido." };
        }

        if (
            typeof horaInicio !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio) ||
            typeof horaFim !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFim)
        ) {
            return { erro: "Informe horários válidos no formato HH:mm." };
        }

        if (horaFim <= horaInicio) {
            return {
                erro: "O horário de término deve ser posterior ao início."
            };
        }

        return {
            dados: { diaSemana, horaInicio, horaFim }
        };
    }

    private obterId(requisicao: Request): string | null {
        const id = requisicao.params.id;
        return typeof id === "string" && id.trim() ? id : null;
    }

    private async temConflito(
        novo: DadosHorarioDisponivel,
        usuarioId: string,
        ignorarId?: string
    ): Promise<boolean> {
        const existentes = await this.repositorioHorarios.listar(usuarioId);

        return existentes.some((existente) => {
            if (
                existente.id === ignorarId ||
                existente.diaSemana !== novo.diaSemana
            ) {
                return false;
            }

            return (
                novo.horaInicio < existente.horaFim &&
                existente.horaInicio < novo.horaFim
            );
        });
    }

    private criarEstrategia(valor: unknown): { id: string; instancia: EstrategiaPrioridade } | null {
        switch (valor) {
            case "combinada": return { id: valor, instancia: new EstrategiaCombinada() };
            case "urgencia": return { id: valor, instancia: new EstrategiaUrgencia() };
            case "dificuldade": return { id: valor, instancia: new EstrategiaDificuldade() };
            case "peso": return { id: valor, instancia: new EstrategiaPeso() };
            default: return null;
        }
    }

    private calcularAjusteEstimativa(tarefas: TarefaComDisciplina[]): {
        tarefasConcluidasUsadas: number; fator: number; adaptacaoAtiva: boolean;
    } {
        const proporcoes = tarefas
            .filter((tarefa) => tarefa.estado === "concluida" && tarefa.tempoEstudado > 0 && tarefa.duracaoEstimada > 0)
            .map((tarefa) => tarefa.tempoEstudado / tarefa.duracaoEstimada)
            .sort((a, b) => a - b);
        if (proporcoes.length < 3) return { tarefasConcluidasUsadas: proporcoes.length, fator: 1, adaptacaoAtiva: false };
        const meio = Math.floor(proporcoes.length / 2);
        const mediana = proporcoes.length % 2 === 0 ? (proporcoes[meio - 1] + proporcoes[meio]) / 2 : proporcoes[meio];
        const fator = Math.round(Math.min(2, Math.max(0.5, mediana)) * 100) / 100;
        return { tarefasConcluidasUsadas: proporcoes.length, fator, adaptacaoAtiva: true };
    }

    private formatarDataLocal(data: Date): string {
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    }

    private lerDataInicio(
        valor: unknown
    ): { data: Date } | { erro: string } {
        if (valor === undefined) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            return { data: hoje };
        }

        if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
            return { erro: "Informe a data inicial no formato AAAA-MM-DD." };
        }

        const [ano, mes, dia] = valor.split("-").map(Number);
        const data = new Date(ano, mes - 1, dia);

        if (
            data.getFullYear() !== ano ||
            data.getMonth() !== mes - 1 ||
            data.getDate() !== dia
        ) {
            return { erro: "A data inicial informada não é válida." };
        }

        data.setHours(0, 0, 0, 0);
        return { data };
    }

    private criarIntervalosDaSemana(
        horarios: Awaited<ReturnType<RepositorioHorarios["listar"]>>,
        dataInicio: Date
    ): { inicio: Date; fim: Date }[] {
        const intervalos: { inicio: Date; fim: Date }[] = [];

        for (let deslocamento = 0; deslocamento < DIAS_DA_SEMANA; deslocamento++) {
            const data = new Date(dataInicio);
            data.setDate(data.getDate() + deslocamento);

            for (const horario of horarios) {
                if (horario.diaSemana !== data.getDay()) {
                    continue;
                }

                const [horaInicio, minutoInicio] = horario.horaInicio
                    .split(":")
                    .map(Number);
                const [horaFim, minutoFim] = horario.horaFim
                    .split(":")
                    .map(Number);
                const inicio = new Date(data);
                const fim = new Date(data);

                inicio.setHours(horaInicio, minutoInicio, 0, 0);
                fim.setHours(horaFim, minutoFim, 0, 0);
                intervalos.push({ inicio, fim });
            }
        }

        return intervalos;
    }
}
