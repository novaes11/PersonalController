---
name: pr-formatter
description: Padroniza a criacao e a formatacao de Pull Requests detalhados, estruturados e visualmente amigaveis, incluindo contexto da task no Notion, tabela de arquivos, auditoria de seguranca (AppSec), evidencias de testes e o aviso obrigatorio de aprovacao e merge exclusivo manual por Joao Vitor Novaes (@novaes11).
---

# PR Formatter: Padrao de Pull Requests Amigavel e Detalhado

Esta skill define o padrao oficial para a geracao de descricoes de Pull Requests criados pelos agentes no projeto PersonalController.

## 1. Regra Fundamental de Aprovacao

> [!IMPORTANT]
> **Aprovador Exclusivo: João Vitor Novaes (@novaes11)**
> Nenhum agente de IA ou pipeline automatizado possui permissao para realizar merge de Pull Requests. O merge depende 100% da revisao manual do usuario.

## 2. Estrutura Obrigatoria do Pull Request

Todo Pull Request deve conter:

1. **Cabecalho do Projeto**: identificacao do sistema e aviso de aprovacao exclusiva.
2. **Contexto da Demanda**:
   - Identificador da task no Notion (`id`).
   - Titulo da task.
   - Data da demanda (`YYYY-MM-DD`).
   - Nome do projeto (`PersonalController`) e responsavel (`João Vitor Novaes`).
   - Nome da branch de feature.
3. **Resumo Tecnico das Alteracoes**:
   - Descricao sucinta da solucao implementada pelo `Minimal Change Engineer (3.35)`.
   - Tabela Markdown listando arquivos impactados, tipo de alteracao e status.
4. **Auditoria de Seguranca (AppSec Engineer 14.02)**:
   - Checklist de protecoes implementadas (politicas RLS com `(SELECT auth.uid())`, prevencao contra SQL Injection e IDOR em transacoes e ativos).
5. **Evidencias da Suite de Testes (Test Automation Engineer 18.06)**:
   - Bloco de codigo formatado demonstrando a execucao com sucesso de cada cenario de teste (Jest / Supertest / PyTest).
   - Parecer do `Senior Project Manager (11.07)` na etapa `4. Valida Suite`.
6. **Checklist de Governanca**:
   - Confirmacao de execucao fora da branch `main`.
   - Commits semanticos padronizados.
   - Itens de revisao manual e merge manual desmarcados para o usuario.
