# Componentes — o que já existe

Inventário de `src/kernel/ui/`. **Antes de criar componente novo, confira aqui.** Metade das telas
inconsistentes nasce de alguém reescrever um cartão que já existia.

Todos são portáteis: nenhum sabe o que é a Plena. Ver regra 1 do [README](README.md).

---

## Inventário

| Arquivo | Exporta | Para quê |
|---|---|---|
| `botao.tsx` | `Botao` | ação |
| `campo.tsx` | `Campo` | entrada de texto |
| `cartao.tsx` | `Cartao`, `CartaoCabecalho`, `CartaoCorpo` | superfície de conteúdo |
| `modal.tsx` | `Modal` | sobreposição com foco |
| `tabela.tsx` | `Tabela`, `Etiqueta` | dado tabular e rótulo de status |
| `progresso-circular.tsx` | `ProgressoCircular` | percentual e prazo |
| `esqueleto.tsx` | `Esqueleto`, `EsqueletoTexto`, `EsqueletoCartao` | carregamento |
| `toast.tsx` | `ProvedorToast`, `useToast` | retorno de ação |
| `transicao.tsx` | utilitários de entrada | movimento de conteúdo |
| `index.ts` | reexporta tudo | importar daqui |

---

## Botão

Quatro variantes e três tamanhos. O padrão é `secundario` / `md` — repare que **o padrão não é o
primário**, de propósito: primário demais numa tela significa nenhum primário.

| Variante | Aparência | Usar quando |
|---|---|---|
| `primario` | acento sólido, com brilho dourado no hover | **uma por tela**, a ação que a pessoa veio fazer |
| `secundario` | vidro com borda que acende no hover | ação de apoio, o caso comum |
| `fantasma` | só texto, fundo aparece no hover | ação terciária, cancelar, item de menu |
| `perigo` | vermelho translúcido com borda | destrutivo, e só quando for mesmo |

| Tamanho | Altura | Usar em |
|---|---|---|
| `sm` | 36px | dentro de linha de tabela ou cartão denso |
| `md` | 44px | padrão, e **o mínimo confortável no celular** |
| `lg` | 52px | ação principal de página, formulário longo |

Estado desabilitado: opacidade 45% e ponteiro desligado. Botão pressionado responde com mola.

> **A escolha do `md` como padrão não é estética.** 44px é o alvo de toque confortável, e o público
> desta interface trabalha do celular.

## Cartão

`Cartao` mais `CartaoCabecalho` e `CartaoCorpo`. Superfície de vidro com raio de 16px.

Desde 01/08/2026 o cartão pode ser âncora para uma seção. Quando for, a rolagem suave é obrigatória —
ver o contexto no [README](README.md).

## Campo

Entrada de texto sobre vidro, estendendo os atributos nativos de `input`. Aceita rótulo e mensagem de
erro.

**Campo obrigatório precisa estar marcado como tal antes do envio**, não só depois do erro. A pessoa
precisa saber o que é exigido enquanto preenche.

## Modal

Sobreposição com fundo escurecido (`0.2s`) e painel entrando com mola (300/28), sobre `vidro-forte`.

**O que ele já resolve, e por isso não se reimplementa modal na mão:**

| Comportamento | Como |
|---|---|
| Fecha no `Escape` | escuta de teclado enquanto aberto |
| Trava a rolagem do fundo | salva e restaura `body.style.overflow` |
| **Prende o foco dentro** | `Tab` no último volta ao primeiro, `Shift+Tab` no primeiro vai ao último |
| Foca ao abrir | primeiro elemento focável do painel |
| Devolve o foco ao fechar | guarda `document.activeElement` na abertura e restaura na saída |

Os três primeiros são exatamente os defeitos que ficaram abertos no menu lateral do painel, anotados
em 03/08/2026. **Quem usa `Modal` não herda nenhum deles** — o que é o argumento prático para a
gaveta lateral passar a reaproveitar essa mesma lógica em vez de manter a própria.

## Tabela

`Tabela<T>` genérica, com colunas declaradas via `Coluna<T>`.

`Etiqueta` é o rótulo de status que acompanha — é **ela** que carrega o texto do estado, o que
sustenta a regra de cor nunca ser o único sinal.

**No celular, tabela larga rola dentro do próprio container.** A página nunca rola na horizontal.

## Progresso circular

Anel SVG animado. A cor vem por classe (`text-ok`, `text-alerta`, `text-critico`), e o pulso crítico
é opcional via prop.

Como ele não conhece os estados, serve a qualquer domínio — é um bom exemplo do que mantém um
componente dentro do kernel.

## Esqueleto

Três granularidades: bloco (`Esqueleto`), linhas de texto (`EsqueletoTexto`) e cartão inteiro
(`EsqueletoCartao`).

**Regra:** toda tela que busca dado tem estado de carregamento. E o esqueleto deve ter
aproximadamente o tamanho do que vai chegar, senão a página pula.

## Toast

`ProvedorToast` no layout raiz, `useToast()` nos componentes.

**Toda ação que muda dado devolve retorno visível.** Ação silenciosa faz a pessoa clicar de novo — e
em cadastro isso vira registro duplicado.

Toast é para confirmação e erro recuperável. **Não é para erro que exige decisão**: aquilo é modal,
porque toast some sozinho.

---

## Antes de criar um componente novo

1. **Já existe?** Confira a tabela acima.
2. **É composição do que existe?** A maioria é.
3. **Ele sabe o que é a Plena?** Se sim, não é kernel: vai para `src/dominio/`.
4. **Tem estado de carregamento, vazio e erro?** Os três, não só o caminho feliz.
5. **Funciona sem movimento?** Chame `useReducedMotion()`.
6. **Funciona só pelo teclado, com foco visível?**
7. **Foi visto em 390px de largura de verdade**, não só imaginado?

O item 7 tem histórico: em 03/08/2026 o menu inteiro do painel de escritório simplesmente não existia
abaixo de 1024px, e o guia de uso mandava clicar num botão que nunca esteve lá. Passou em toda
verificação automática e só apareceu ao encolher a janela.
