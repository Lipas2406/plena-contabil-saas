# Especificação visual — Plena Contábil

**Por que esta pasta existe:** até 04/08/2026, as decisões visuais deste projeto viviam só em
`globals.css`, nos componentes e na cabeça de quem escreveu. Isso funciona enquanto o autor é um só e
a memória está fresca. Quebra na primeira tela nova feita com pressa, e quebra silenciosamente — a
tela sai "quase igual" e ninguém consegue apontar o quê.

Uma especificação escrita transforma "achei que ficou bom" em "está conforme" ou "não está".

> **Regra de uso:** antes de criar tela, componente ou variação nova, leia
> [`fundamentos.md`](fundamentos.md). Se o que você precisa não existe lá, **a decisão é acrescentar
> à spec e então implementar** — não implementar e documentar depois, porque o depois não vem.

## Índice

| Arquivo | O que responde |
|---|---|
| [`fundamentos.md`](fundamentos.md) | Cor, tipografia, superfície, raio, espaço |
| [`movimento.md`](movimento.md) | Animação, duração, curva, e quando não animar |
| [`componentes.md`](componentes.md) | O que já existe, e quando usar cada um |

---

## As cinco regras que não se quebram

Estas valem mais que qualquer detalhe dos outros arquivos. Se uma delas for violada, o problema é
estrutural, não estético.

### 1. Componente do kernel não sabe o que é a Plena
`src/kernel/` é código portátil. Nenhum arquivo lá pode mencionar cliente, obrigação fiscal ou
qualquer termo do negócio, **nem por meio da cor**: um botão que referencia `--color-acento` viaja
para o próximo projeto e assume a marca de lá; um que referencia `--color-gold` fica preso aqui para
sempre.

O teste está em `src/kernel/README.md`: copiar a pasta inteira para um projeto novo e não precisar
apagar uma linha.

### 2. Componente usa token semântico, nunca valor de marca
`--color-acento`, não `--color-gold`. `--color-superficie`, não `--color-navy-mid`. A camada de marca
existe para ser trocada num lugar só.

### 3. Toda animação respeita `prefers-reduced-motion`
Não é acabamento. A interface é pesada em movimento, e sem isso ela fica **inutilizável** para quem
tem sensibilidade vestibular. Os cinco componentes animados do kernel já chamam `useReducedMotion()`,
e o `globals.css` tem a rede de segurança global.

### 4. Foco sempre visível
`:focus-visible` com contorno de 2px na cor de acento, com deslocamento. Quem navega por teclado
precisa saber onde está. Nunca remover contorno de foco sem colocar outro no lugar.

### 5. Cor nunca é o único portador de significado
Um prazo crítico não é "o vermelho". É o vermelho **mais** o rótulo de status **mais**, quando
aplicável, o pulso. Quem não distingue as cores continua conseguindo operar.

---

## Contexto que explica as escolhas

O público final desta interface **não é técnico**. É uma contadora que trabalha do celular, entre um
atendimento e outro. Isso decidiu coisas que, fora desse contexto, pareceriam exagero:

- **Rolagem suave** (`scroll-behavior: smooth`) foi ligada em 01/08/2026 quando os cartões viraram
  âncoras. Sem ela, o clique salta a página e quem tem menos prática digital perde a relação entre o
  que clicou e o que mudou na tela.
- **Nenhum canto vivo.** Raio mínimo de 16px em qualquer superfície.
- **Estado vazio e estado de carregamento são obrigatórios**, não opcionais — ver o esqueleto em
  `componentes.md`.

Ver também [`../CLAUDE.md`](../CLAUDE.md) e `src/kernel/README.md`.
