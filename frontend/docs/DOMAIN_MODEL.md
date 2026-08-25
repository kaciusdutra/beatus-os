# DOMAIN MODEL

## Objetivo

Este documento descreve como o Beatus funciona como negócio.

Ele não depende de linguagem de programação, banco de dados ou framework.

Toda implementação deverá respeitar este documento.

---

# ENTIDADES

## Pedido

### O que é

Representa uma venda realizada pelo Beatus.

É a entidade central do sistema.

Todos os módulos são impactados por um Pedido.

### Possui

- Número
- Cliente
- Canal de Venda
- Produtos
- Observações
- Pagamento
- Horário
- Status

### Estados

Recebido

↓

Pago

↓

Em Produção

↓

Pronto

↓

Em Entrega

↓

Entregue

↓

Finalizado

### Eventos

PedidoCriado

PedidoPago

PedidoProduzido

PedidoDespachado

PedidoEntregue

PedidoCancelado

---

## Produto

Representa um item vendido pelo Beatus.

Todo Produto possui uma Receita.

---

## Receita

Define como um Produto é produzido.

Uma Receita consome Ingredientes.

---

## Ingrediente

Representa qualquer insumo utilizado na produção.

Exemplos:

- Blend
- Bacon
- Queijo
- Molho
- Alface

Todo Ingrediente possui estoque.

---

## Estoque

Controla a quantidade disponível dos Ingredientes.

---

## Cliente

Representa quem realiza um Pedido.

---

## Operação

Representa um dia de trabalho do Beatus.

Uma Operação possui:

- abertura
- checklist
- briefing
- produção
- fechamento

---

## Usuário

Pessoa autorizada a utilizar o sistema.

Exemplos:

Administrador

Produção

Caixa

Gerente

---

# EVENTOS

Toda mudança importante gera um Evento.

Exemplos:

PedidoCriado

↓

Atualizar Dashboard

↓

Atualizar Produção

↓

Atualizar Financeiro

↓

Atualizar IA

---

# PRINCÍPIOS

O Pedido é o centro do sistema.

A IA observa eventos, nunca altera dados diretamente.

Nenhum módulo deve depender diretamente de outro.

A comunicação ocorre através de Eventos.