# Beatus: Identidade visual

> Fonte: o manual de marca enviado pelo Kacius em 15/11/2026 (mockup com logo, variações, paleta, fontes e aplicações). Os códigos de cor escritos no mockup estão corrompidos; os valores abaixo foram **medidos nos pixels da imagem**.

## Marca

- **Símbolo:** pão de hambúrguer estilizado (cúpula e duas barras arredondadas). Recriado em vetor em `frontend/public/marca/beatus-simbolo.svg`.
- **Logotipo:** "BEATUS" em letras grandes e "BURGER DELIVERY" em branco, espaçado, embaixo.
- **Variações do manual:** horizontal sobre preto, preto sobre fundo claro e emblema redondo (símbolo dentro de um círculo dourado, com "BEATUS" embaixo).

## Cores

| Uso | Valor | No sistema |
|---|---|---|
| Dourado (cor da marca) | `#C3965C` | `ouro` (Tailwind: `bg-ouro`, `text-ouro`) |
| Preto da marca | `#111111` (o manual mostra preto profundo, medido `#141414`) | `marca-preto` |
| Cinza claro | `#D9D9D9` | `marca-cinza` |

As cores estão em `frontend/app/globals.css`. O ícone do app (`public/icone-beatus.svg` e `app/icon.svg`) usa símbolo dourado sobre preto.

## Fontes do manual

- **Títulos:** Gelion. **Textos:** Satoshi.
- Ainda **não adotadas** no sistema (hoje: Geist). Dependem de decisão do Kacius sobre licença e arquivos (ver BACKLOG).

## Onde a marca já aparece

- Topo do menu lateral (símbolo, "BEATUS", "BURGER DELIVERY") e item ativo do menu em dourado.
- Ícone do app instalado no celular, aba do navegador e cor da barra do celular.

## Ainda não aplicado

- Cores de destaque das telas de PDV, Pedidos e Operação (hoje laranja), etiquetas, cardápio online, comprovantes e cartão-convite.
