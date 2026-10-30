import { Router } from "express";
import { ControladorSessoesEstudo } from "../controllers/controlador-sessoes-estudo.js";

const rotas = Router();
const controlador = new ControladorSessoesEstudo();
rotas.get("/hoje", controlador.listarDia);
rotas.get("/resumo", controlador.resumoPeriodo);
rotas.post("/planejada/concluir", controlador.concluirPlanejada);
rotas.post("/registrar", controlador.registrarEstudo);
export default rotas;
