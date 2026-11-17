# Ligar a Beatriz (chave da IA)

A Beatriz usa a IA da Anthropic (Claude). Sem a chave, o chat do site **não aparece** e a tela Inteligência → Beatriz avisa que falta a chave. Nada quebra.

## Passo a passo

1. Entre em **console.anthropic.com** e crie a conta da empresa (ou entre com a que já tem).
2. Em **Billing** (cobrança), cadastre o cartão e **compre créditos** (o uso é cobrado por mensagem; comece com um valor pequeno). Se houver a opção de **limite de gasto mensal**, defina um: é a sua proteção principal contra custo inesperado.
3. Em **API Keys**, crie uma chave nova (nome sugerido: `beatus-producao`) e **copie na hora**: ela só aparece uma vez.
4. Abra o arquivo `frontend/.env` do servidor e acrescente uma linha:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

5. **Reinicie o sistema.** Em Inteligência → Beatriz deve aparecer "IA ligada · modelo ...".

## Cuidados

- A chave é uma senha: **nunca** a coloque no GitHub (o `.env` já é ignorado pelo Git), em mensagem, e-mail ou conversa (nem aqui comigo). Se vazar, apague a chave no console e crie outra.
- A chave fica só no servidor e nunca vai para o navegador.
- Uma chave para teste e outra para produção é o ideal: assim dá para apagar uma sem derrubar a outra.

## Outras opções do `.env` (todas opcionais)

| Variável | Para quê |
|---|---|
| `BEATRIZ_MODELO` ou `ANTHROPIC_MODELO` | Troca o modelo (o padrão é o Sonnet, que equilibra custo e qualidade) |
| `BEATRIZ_TETO_DIARIO_SITE` | Teto de mensagens por dia no chat do site (padrão 300; 0 desliga o chat). O contador zera ao reiniciar o sistema |

## Antes de abrir o chat para o público

1. Chave da IA configurada e **uma conversa de teste real** em Inteligência → Beatriz e no chat do site (roteiro, itens 275 a 287).
2. **Política de privacidade** revisada por quem entende de LGPD e preenchida com os dados da empresa (razão social, CNPJ, endereço e e-mail de contato). O texto já cita a Beatriz, a IA e a memória.
3. **Limite de gasto** definido no console da Anthropic.
4. Casa aberta e preços do canal Site definidos (o chat só oferece o que tem preço).
