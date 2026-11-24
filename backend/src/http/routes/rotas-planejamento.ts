import { Router } from "express";
import { ControladorPlanejamento } from "../controllers/controlador-planejamento.js";

const rotas = Router();
const controlador = new ControladorPlanejamento();

rotas.get("/horarios", controlador.listarHorarios);
rotas.post("/horarios", controlador.criarHorario);
rotas.put("/horarios/:id", controlador.atualizarHorario);
rotas.delete("/horarios/:id", controlador.excluirHorario);
rotas.get("/estrategias", controlador.listarEstrategias);
rotas.get("/semanal", controlador.buscarSemanaSalva);
rotas.get("/calendario", controlador.listarCalendario);
rotas.put("/calendario/:id/mover", controlador.moverSessaoCalendario);
rotas.get("/historico", controlador.listarHistorico);
rotas.delete("/historico", controlador.excluirHistorico);
rotas.get("/historico/:id", controlador.buscarHistorico);
rotas.get("/estimativas", controlador.resumoEstimativas);
rotas.get("/resumo", controlador.resumoPlanejado);
rotas.post("/gerar", controlador.gerarPlano);

export default rotas;
