import { Router } from "express";
import { ControladorAutenticacao } from "../controllers/controlador-autenticacao.js";
import { autenticar } from "../middleware/autenticar.js";

const rotas = Router();
const controlador = new ControladorAutenticacao();

rotas.post("/cadastro", controlador.cadastrar);
rotas.post("/login", controlador.entrar);
rotas.get("/me", autenticar, controlador.atual);
rotas.put("/me", autenticar, controlador.atualizarPerfil);
rotas.put("/me/senha", autenticar, controlador.alterarSenha);
rotas.post("/logout", autenticar, controlador.sair);

export default rotas;
