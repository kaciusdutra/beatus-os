# Beatus: Identidade visual

> Fonte: o manual de marca enviado pelo Kacius em 15/11/2026 (mockup com logo, variações, paleta, fontes e aplicações). Os códigos de cor do mockup saíram corrompidos (`#CESCSB`, `#D9D999`); foram decifrados e conferidos com os pixels da imagem: `#CESCSB` = `#C3965B`, e o cinza é neutro (`#D9D9D9`).

## Marca

- **Símbolo:** pão de hambúrguer estilizado (cúpula e duas barras arredondadas). Recriado em vetor em `frontend/public/marca/beatus-simbolo.svg`.
- **Logotipo:** "BEATUS" em letras grandes e "BURGER DELIVERY" em branco, espaçado, embaixo.
- **Variações do manual:** horizontal sobre preto, preto sobre fundo claro e emblema redondo (símbolo dentro de um círculo dourado, com "BEATUS" embaixo).

## Cores

| Uso | Valor | No sistema |
|---|---|---|
| Dourado (cor da marca) | `#C3965B` | `ouro` (Tailwind: `bg-ouro`, `text-ouro`) |
| Preto da marca | `#000000` | `marca-preto` |
| Cinza claro | `#D9D9D9` | `marca-cinza` |

As cores estão em `frontend/app/globals.css`. O ícone do app (`public/icone-beatus.svg` e `app/icon.svg`) usa símbolo dourado sobre preto.

## Fontes

- **Títulos:** Gelion (pesos 400 a 800). **Textos:** Satoshi (variável, 300 a 900). Aplicadas em 15/11/2026 a partir das cópias instaladas no notebook do Kacius.
- Os arquivos ficam em `frontend/public/fonts/`, **fora do Git** (o repositório do GitHub é público e a licença de redistribuição não foi conferida). Em outro computador ou na hospedagem, é preciso colocar os arquivos nessa pasta; sem eles o sistema usa a fonte de reserva (Geist/Arial) e continua funcionando.
- Conferir a licença de uso na web de cada fonte antes de hospedar o sistema e o cardápio online.

## Onde a marca já aparece

- Topo do menu lateral (símbolo, "BEATUS", "BURGER DELIVERY") e item ativo do menu em dourado.
- Ícone do app instalado no celular, aba do navegador e cor da barra do celular.

## Dourado nas telas

O laranja de destaque das telas (PDV, Marketplace, Horários, Dashboard) foi trocado pela escala dourada `ouro-50` a `ouro-900` (`ouro-500` é o dourado da marca). Botões cheios e textos usam um tom mais escuro (600 a 800) para manter a leitura sobre o branco. Fica de fora o componente legado `PedidoStatusBadge`, que será removido.

## Ainda não aplicado

- Etiquetas, comprovantes, cartão-convite e cardápio online.
