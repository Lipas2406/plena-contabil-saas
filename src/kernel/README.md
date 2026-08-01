# kernel/

**Regra única desta pasta:** nada aqui pode saber o que é a Plena Contábil.

Sem menção a cliente, obrigação fiscal, regime tributário ou qualquer termo do
negócio. Se um arquivo daqui importa de `@/dominio`, a separação foi quebrada.

## O teste de aceitação

Copiar `src/kernel/` inteiro para um projeto novo e não precisar apagar uma linha.
Se precisou apagar, aquilo era domínio disfarçado e deve voltar para `src/dominio/`.

## O que mora aqui

| Arquivo | Responsabilidade |
|---|---|
| `cn.ts` | merge de classes Tailwind |
| `datas.ts` | data civil sem armadilha de timezone |
| `br.ts` | formatação brasileira: BRL, CNPJ, CPF |
| `mock.ts` | geração de seed com data relativa |
| `ia/ferramenta.ts` | **o padrão central**: regra pura + invólucro de framework |
| `ia/agente.ts` | fábrica de agente com instanciação preguiçosa |

## Por que `ia/ferramenta.ts` é o arquivo mais importante do repo

É o único ponto onde o código encosta no framework de agente (hoje VoltAgent).
A regra de negócio de cada ferramenta é função pura, testável sem gastar token,
e o invólucro é gerado a partir dela.

Trocar VoltAgent por AI SDK puro, ou por qualquer outro, é editar **um arquivo**.
Nenhuma regra de negócio muda. Foi de propósito: o VoltAgent está fixado em
`ai@6` enquanto o AI SDK já vai no 7, então essa troca provavelmente vai acontecer.
