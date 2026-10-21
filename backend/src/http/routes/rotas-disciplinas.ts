
import { Router } from "express";
import { ControladorDisciplinas } from "../controllers/controlador-disciplinas.js";

const rotas = Router();
const controlador = new ControladorDisciplinas();

rotas.get("/", controlador.listar);
rotas.get("/:id", controlador.buscarPorId);
rotas.post("/", controlador.criar);
rotas.put("/:id", controlador.atualizar);
rotas.delete("/:id", controlador.excluir);

export default rotas;
