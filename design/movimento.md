# Movimento — animação, duração e quando não animar

Framework: **Framer Motion**. Fonte da verdade em `src/kernel/ui/transicao.tsx`,
`modal.tsx`, `botao.tsx`, `cartao.tsx` e `progresso-circular.tsx`.

---

## A regra que vem antes de todas

**Todo componente animado chama `useReducedMotion()` e tem um caminho sem movimento.**

Não é acabamento nem gentileza. Esta interface é pesada em animação, e sem esse caminho ela fica
inutilizável para quem tem sensibilidade vestibular — movimento demais provoca náusea e tontura de
verdade.

Existem duas camadas de proteção, e as duas devem continuar existindo:

1. **No componente:** `useReducedMotion()` do Framer Motion, que troca a animação por um estado final
   imediato. É o que faz o elemento **aparecer já pronto** em vez de aparecer parado no estado
   inicial.
2. **No CSS:** o bloco `@media (prefers-reduced-motion: reduce)` em `globals.css`, que zera duração
   de animação e transição no documento inteiro. É rede de segurança para o que escapou.

A camada 1 não é dispensável por causa da 2: zerar a duração de uma animação que anima opacidade de 0
a 1 deixa o elemento visível; zerar a de um `strokeDashoffset` pode deixar o anel de progresso vazio
para sempre. Por isso o `progresso-circular` inicia já no valor final quando o usuário pede menos
movimento.

---

## Duas linguagens de movimento

O projeto usa duas, e a escolha entre elas não é estética.

### Curva de tempo — para o que aparece e desaparece
Usada em entrada de conteúdo e transição de página.

- **Curva:** `cubic-bezier(0.16, 1, 0.3, 1)` — saída exponencial. Arranca rápido e desacelera longo,
  o que dá sensação de coisa chegando ao lugar em vez de coisa sendo empurrada.
- **Durações reais em uso:** `0.2s` para o fundo escurecido do modal, `0.35s` para transição de
  conteúdo, `0.45s` para entrada em sequência.

### Física de mola — para o que responde ao dedo
Usada em elemento que reage a interação direta.

| Onde | Rigidez | Amortecimento |
|---|---|---|
| Botão (pressionar) | 400 | 25 |
| Modal (entrada do painel) | 300 | 28 |

Mola não tem duração declarada: ela termina quando a física termina. É o que faz o toque parecer
material, e é por isso que o botão usa mola e a transição de página usa curva de tempo.

**Amortecimento sempre alto o bastante para não oscilar.** Interface de trabalho não balança.

---

## Padrões prontos

### Entrada em sequência
`transicao.tsx` cobre a entrada escalonada de listas. Item entrando um a um comunica ordem e dá ao
olho o tempo de acompanhar. **Não usar em lista longa** — a espera pelo último item vira lentidão.

### Esqueleto de carregamento
A classe `esqueleto` aplica um brilho varrendo da esquerda para a direita, em ciclo de `1.6s`.

**Quando usar:** sempre que houver espera com formato previsível. O esqueleto deve ter
aproximadamente o tamanho do conteúdo que vai chegar — se ele for menor, a página pula quando o dado
carrega, e o pulo é pior que a espera.

### Pulso crítico
A classe `pulso-critico` oscila a opacidade entre 100% e 55% em ciclo de `2s`.

**Reservado para prazo crítico.** Se tudo pulsa, nada é crítico. É o recurso mais chamativo do
sistema e deve continuar sendo o mais raro.

### Progresso circular
Anel em SVG com `strokeDasharray` igual ao perímetro e `strokeDashoffset` animado do perímetro
(vazio) até o valor final. A cor entra por classe (`text-ok`, `text-critico`), então o mesmo
componente serve a todos os estados sem saber o que eles significam — que é o que o mantém dentro do
kernel.

---

## Quando não animar

- **Quando o usuário pediu menos movimento.** Sempre.
- **Quando o movimento não comunica nada.** Animação que só enfeita cobra tempo de quem está
  trabalhando.
- **Em atualização de dado que a pessoa está lendo.** Número que anima enquanto alguém confere um
  valor atrapalha a conferência.
- **Em lista longa.** Ver entrada em sequência acima.
