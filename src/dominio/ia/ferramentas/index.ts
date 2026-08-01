import { consultarVencimentos } from "./consultar-vencimentos";
import { classificarDocumento } from "./classificar-documento";

/** Ferramentas do Assistente Contábil. Registrar novas aqui. */
export const FERRAMENTAS_CONTABEIS = [
  consultarVencimentos,
  classificarDocumento,
] as const;

export { consultarVencimentos, classificarDocumento };
