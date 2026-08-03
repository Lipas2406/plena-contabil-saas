# Plena Contábil · SaaS

Painel para um escritório de contabilidade pequeno: o contador vê a carteira inteira em uma tela,
e cada cliente acompanha o próprio processo sem precisar perguntar no WhatsApp.

Next.js 16 · React 19 · TypeScript · Tailwind v4 · camada de IA com ferramentas tipadas.

> **Demonstração com dado anonimizado.** A estrutura da carteira é real, veio de uma contadora de
> verdade. Os nomes são falsos e o CNPJ tem dígito verificador quebrado de propósito, então não
> existe e não colide com empresa nenhuma. Um teste do portão confere isso por cálculo.

---

## O problema

A contadora guardava informação de cliente em três lugares: e-mail, PC do trabalho e PC de casa.
Quando o cliente perguntava "e a minha abertura, como está?", a resposta dependia de ela lembrar
onde tinha anotado.

Ao levantar a carteira real apareceu o detalhe que mudou o projeto: **nenhum dos 6 clientes é
contabilidade mensal recorrente.** São 2 aberturas de empresa, 1 regularização fiscal, 2 suportes
e 1 imposto de renda de pessoa física. O painel tinha sido construído na premissa oposta, cliente
com guia todo mês, então trocar só os nomes deixaria a tela vazia para todo mundo.

O domínio ganhou o conceito de **processo com etapas**, irmão da obrigação: obrigação se repete e
tem vencimento legal, processo acontece uma vez e tem etapa. Modelar pelo trabalho real do cliente,
em vez do trabalho que eu tinha imaginado, foi a decisão mais cara e a mais certa do projeto.

## O que dá para ver

| Rota | O que é |
|---|---|
| `/painel` | Visão do cliente: seus processos, em que etapa cada um está, o que falta |
| `/escritorio` | Visão do contador: carteira inteira, prazos, quadro de tarefas, fila de documentos |

O cliente logado é fixo em `src/dominio/sessao.ts`, porque ainda não há autenticação. O caso mais
rico é o `cli-001`, com 6 etapas e uma travada em vermelho, com o motivo escrito na tela.

## Rodar

```bash
npm install
npm run dev            # localhost:3000
npm run checar-tudo    # typecheck + lint + 40 checagens de regra + build
```

`OPENAI_API_KEY` é opcional: sem ela o painel roda igual, só o endpoint do assistente responde 503
com mensagem explícita.

---

## Decisões de arquitetura

### Kernel separado do domínio, antes de qualquer tela

`src/kernel/` é o que viaja para o próximo projeto: componentes de UI, formatação brasileira, datas,
o padrão de ferramenta de agente. `src/dominio/` é contabilidade e não sai daqui.

A separação foi feita **antes** da primeira tela. Depois vira refatoração que nunca acontece. O
design system também tem duas camadas: tokens de marca (navy e dourado) e tokens semânticos.
Componentes do kernel só tocam os semânticos, então trocam de marca sem editar CSS.

### Ferramenta de agente = regra pura + invólucro fino

Cada ferramenta de IA tem a regra numa função pura, testável sem LLM e sem chave de API, e um
invólucro de uma dúzia de linhas que conversa com o framework. `scripts/verificar.mts` chama `.puro`
direto e exercita o comportamento inteiro sem rede.

Efeito prático: a regra de negócio não fica refém da versão do SDK. Quando o `@voltagent` mudou de
API no meio do projeto, um arquivo mudou.

### `null` significa "não informado", nunca zero

Numa carteira real a maior parte dos cadastros nasce incompleta. A tela precisa saber a diferença
entre "sem CNPJ porque a empresa está sendo aberta" e "sem CNPJ porque ninguém digitou". `0` e `--`
mentem: parecem informação apurada.

Efeito colateral bom: a tela vira formulário de coleta, levantando sozinha o que falta puxar com o
cliente.

O erro que isso pegou tarde: guardar `"Não informado"` **como texto** no campo é pior que inventar,
porque a mentira fica invisível para o próprio sistema. O campo saía bonito na tela e, ao mesmo
tempo, sumia da lista de lacunas. Hoje uma checagem do portão recusa texto sentinela em campo de
dado.

### Quadro derivado, nunca lista paralela

O pedido era um kanban de tarefas. A tentação é criar uma lista de tarefas ao lado dos dados que já
existem, e aí passam a existir duas verdades sobre o mesmo trabalho, que divergem na primeira
semana. Cada cartão do quadro **é** uma etapa de processo: mover o cartão move a etapa, e a tela do
cliente reflete na hora.

O mesmo vale para os avisos do painel, que são condições derivadas do estado real (etapa travada,
cadastro incompleto) e não uma caixa de mensagens. Aviso some sozinho quando o assunto se resolve,
então "marcar como lida" deixou de fazer sentido e o contador passou a dizer a verdade.

### Nada na tela finge funcionar

Quatro elementos decorativos foram removidos por anunciarem função inexistente: busca, menu de
conta, botão "sair" e "marcar todas como lidas". As rotas ainda não construídas ficam no menu
marcadas com "em breve", e a tela explica o que vai existir ali **e como resolver o assunto hoje**.
Esconder o roteiro do produto seria pior, e deixar o clique cair no vazio também.

O mesmo critério vale para o ambiente: publicado em hospedagem somente leitura, o cadastro de
cliente não vira botão quebrado, vira aviso do que está desativado e por quê.

---

## O que aprendi

**Levantar o trabalho real do cliente vale mais que qualquer refinamento de tela.** Uma conversa
sobre a carteira derrubou a premissa central do produto quando o painel já estava bonito.

**Pendência escrita de memória vira dívida falsa.** Três itens da minha lista estavam errados no
mesmo dia, e os três custavam horas de trabalho inútil. Um `git log` de dois minutos provou que o
histórico do repositório nasceu limpo, o que apagou uma tarefa de 2 h que nunca precisou existir.

**Ressalva que não está onde a pessoa olha não existe.** Os status de etapa eram estimativa, e isso
estava avisado num comentário de código. O cliente não lê o repositório: na tela, o chute tinha a
mesma autoridade do dado apurado. Hoje é um campo do domínio e um aviso no cartão, que some sozinho
quando o dado real entra.

**Portão de qualidade paga na hora.** As 40 checagens de `npm run checar-tudo` pegaram, entre outras
coisas, um `Intl` em pt-BR que usa espaço não separável (U+00A0) e quebrava comparação de string por
um caractere invisível, e um texto sentinela que a minha própria correção manual tinha deixado
passar minutos antes.

**Verificar no ambiente, não deduzir.** A persistência em arquivo funcionava perfeitamente local e
derrubaria a aplicação inteira em hospedagem serverless, porque `process.cwd()` é somente leitura
lá. Só apareceu porque a hipótese foi testada de verdade, simulando o disco bloqueado, em vez de
assumir que "deve funcionar".

---

## Estado

Demonstração honesta e completa dentro do que se propõe. **Não tem** autenticação, banco de dados
nem isolamento entre clientes: a persistência é um arquivo JSON local, degrau mínimo entre mock
estático e banco. Quando entrar banco, só `src/dominio/armazenamento-clientes.ts` muda, porque
nenhuma tela importa `fs`.
