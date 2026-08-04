# Fundamentos — cor, tipografia, superfície

Fonte da verdade em código: [`src/app/globals.css`](../src/app/globals.css). Este documento explica
**o porquê**; o CSS tem os valores. Se os dois divergirem, o CSS venceu e este arquivo está
desatualizado.

---

## Cor: duas camadas, de propósito

O conceito é **design tokens em camadas** — separar o valor literal do papel que ele cumpre.

### Camada 1 — Marca
Os valores literais, extraídos da prévia aprovada da landing page. Só mudam se a identidade mudar.

| Token | Valor | O que é |
|---|---|---|
| `--color-navy-deep` | `#070f1f` | o mais escuro, para profundidade |
| `--color-navy` | `#0a1628` | o fundo da aplicação |
| `--color-navy-mid` | `#122040` | superfície elevada |
| `--color-gold` | `#c9a84c` | o acento da marca |
| `--color-gold-light` | `#e2c670` | acento em realce e hover |
| `--color-off-white` | `#f8f6f0` | texto principal |
| `--color-text-muted` | `#8a9bb5` | texto secundário |

### Camada 2 — Semânticos
Nomes por **função**. É o que os componentes usam.

| Token | Aponta para | Usar quando |
|---|---|---|
| `--color-fundo` | navy | fundo da página |
| `--color-fundo-profundo` | navy-deep | fundo de área recuada |
| `--color-superficie` | navy-mid | cartão, painel, modal |
| `--color-acento` | gold | ação principal, foco, destaque |
| `--color-acento-claro` | gold-light | hover e realce sobre acento |
| `--color-texto` | off-white | texto de leitura |
| `--color-texto-suave` | text-muted | legenda, rótulo, apoio |

**A regra que decorre disso:** componente em `src/kernel/` só toca na camada 2. Isso é o que permite
levar o kernel inteiro para outro projeto sem editar nada.

### Status
Cores de estado, usadas em obrigação fiscal e documento. São semânticas desde o nascimento.

| Token | Valor | Significa |
|---|---|---|
| `--color-ok` | `#34d399` | em dia, concluído |
| `--color-alerta` | `#e2c670` | atenção, prazo se aproximando |
| `--color-critico` | `#f87171` | vencido, bloqueado |
| `--color-info` | `#60a5fa` | informativo, neutro |
| `--color-wa` | `#25d366` | WhatsApp (cor da plataforma, não da marca) |

> **Nunca use cor como único sinal.** Ver regra 5 do [README](README.md).

### Valores com transparência ficam fora do `@theme`
`--vidro`, `--borda-suave`, `--brilho-acento`, `--sombra-profunda` e companhia moram em `:root` e são
consumidos via `var()` direto.

O motivo é prático: o Tailwind v4 gera um utilitário para **cada** `--color-*` declarado no `@theme`.
Dezenas de variações translúcidas viram ruído no autocomplete e escondem os tokens que importam.

---

## Tipografia

Duas famílias, carregadas por `next/font/google` com `display: "swap"`.

| Papel | Fonte | Token | Onde |
|---|---|---|---|
| Display | Playfair Display (serifada) | `--font-display` | título de página e de seção, número de destaque |
| Texto | Inter | `--font-sans` | todo o resto |

**Detalhe de implementação que importa:** as fontes são carregadas com `variable`, não com
`className`. Elas viram custom properties, o `globals.css` as consome dentro do `@theme`, e aí
`font-display` e `font-sans` funcionam como utilitário Tailwind normal em qualquer componente. Com
`className`, cada componente precisaria importar a fonte.

O `display: "swap"` troca texto invisível por texto com fonte de sistema durante o carregamento — o
conteúdo é legível antes de a fonte chegar.

Renderização: `-webkit-font-smoothing: antialiased` e `text-rendering: optimizeLegibility` no `body`.

---

## Superfície: o vidro

O que separa as camadas da interface é **glassmorphism** — fundo translúcido com desfoque do que está
atrás, não uma cor sólida mais clara.

| Utilitário | Desfoque | Saturação | Usar em |
|---|---|---|---|
| `vidro` | 16px | 140% | cartão, campo, superfície comum |
| `vidro-forte` | 24px | 160% | modal, painel sobreposto, barra fixa |

Os dois trazem `border: 1px solid var(--borda-suave)` embutida. A saturação acima de 100% é o que
impede o vidro de parecer cinza sujo sobre o fundo navy.

### Fundo da aplicação
Dois gradientes radiais sobrepostos ao navy sólido, com `background-attachment: fixed`:

1. um clarão navy no canto superior esquerdo;
2. um brilho dourado bem sutil (7% de opacidade) no canto superior direito.

Sendo `fixed`, o fundo não rola junto com o conteúdo — a página inteira parece uma superfície só, e
não uma sequência de blocos.

### Texto em degradê
O utilitário `texto-dourado` aplica um gradiente de três paradas com `background-clip: text`. É para
**número de destaque e título de seção**, não para texto corrido: gradiente em bloco de leitura
prejudica o contraste.

---

## Raio

Decisão registrada no CSS: nada de canto vivo.

| Token | Valor | Usar em |
|---|---|---|
| `--radius-card` | 16px | cartão, campo, botão grande |
| `--radius-painel` | 24px | modal, painel, seção |
| `--radius-pill` | 999px | etiqueta, badge, barra de progresso |

---

## Elevação

Não há escala de sombra genérica. Há duas, ambas com deslocamento vertical grande e desfoque largo,
que é o que produz sombra difusa em interface escura em vez de contorno duro.

| Token | Usar em |
|---|---|
| `--sombra-profunda` | cartão elevado, popover |
| `--sombra-elevada` | modal, o que está por cima de tudo |

Sobre acento existe ainda um brilho, não uma sombra: o botão primário usa
`shadow-[0_12px_32px_-8px_rgba(201,168,76,0.75)]` no hover — o dourado emite luz em vez de projetar
sombra.

---

## Detalhes que parecem pequenos e não são

**Barra de rolagem** foi customizada (8px, polegar dourado a 28% de opacidade, sem trilha). A padrão
do sistema é clara e rasga o tema escuro no canto da tela.

**Foco visível** usa contorno de 2px na cor de acento com `outline-offset: 2px` e raio de 4px. Vale
para o documento inteiro via `:focus-visible`, então nasce funcionando em componente novo.
