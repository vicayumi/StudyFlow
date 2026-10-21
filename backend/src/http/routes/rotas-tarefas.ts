
import { Router } from "express";
import { ControladorTarefas } from "../controllers/controlador-tarefas.js";

const rotas = Router();
const controlador = new ControladorTarefas();

rotas.get("/", controlador.listar);
rotas.post("/", controlador.criar);
rotas.put("/:id", controlador.editar);
rotas.patch("/:id/concluir", controlador.concluir);
rotas.delete("/:id", controlador.excluir);

export default rotas;
