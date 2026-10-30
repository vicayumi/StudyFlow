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
            const plano = await this.repositorioPlanos.buscarSemana(chave, requisicao.usuarioId!);
            if (!plano) {
                resposta.status(404).json({ erro: "Ainda não há um plano salvo para essa semana." });
                return;
            }
            resposta.json(plano);
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
            const [sessoes, concluidas] = await Promise.all([
                this.repositorioPlanos.listarSessoesDoMes(ano, mes, requisicao.usuarioId!),
                this.repositorioSessoes.listarIdsPlanejadosConcluidos(requisicao.usuarioId!)
            ]);
            const idsConcluidos = new Set(concluidas);
            resposta.json(sessoes.map((sessao) => ({ ...sessao, concluida: idsConcluidos.has(sessao.id) })));
        } catch (erro) {
            console.error("Erro ao carregar sessões do calendário:", erro);
            resposta.status(500).json({ erro: "Não foi possível carregar os planos salvos." });
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

        try {
            const [horarios, tarefasSalvas] = await Promise.all([
                this.repositorioHorarios.listar(requisicao.usuarioId!),
                this.repositorioTarefas.listarTodas(requisicao.usuarioId!)
            ]);
            const tarefas = tarefasSalvas.map((dados) => {
                const tarefa = new Tarefa(
                    dados.id,
                    dados.titulo,
                    dados.descricao,
                    new Date(dados.dataPrazo),
                    dados.dificuldade,
                    dados.duracaoEstimada,
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
            const gerador = new GeradorPlanejamento(estrategia.instancia);
            const resultado = gerador.gerar(
                tarefas,
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
            const sessoes = resultado.sessoes
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
            const tarefasSemTempo = resultado.tarefasSemTempo.map((id) => ({
                id,
                titulo: titulosPorId.get(id) ?? "Tarefa"
            }));
            const dadosPlano = {
                dataInicio: this.formatarDataLocal(dataInicio.data),
                estrategia: estrategia.id,
                sessoes,
                prioridades,
                tarefasSemTempo
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
