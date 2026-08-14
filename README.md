# Operaon Integration Hub

Standalone responsável pelo catálogo de providers, configurações por ambiente, credenciais cifradas, teste de conexão e health checks das integrações da plataforma Operaon.

## Responsabilidade

O serviço é dono do catálogo dinâmico de providers, dos registros de integração por ambiente, do envelope cifrado de credenciais, da resolução da integração ativa e da auditoria redacted. Providers são dados configuráveis no banco; o código não mantém uma allowlist operacional fixa.

O Integration Hub **não executa o domínio de negócio** dos providers. Identity, Clinical, Notification & Delivery e os demais standalones continuam responsáveis por sua própria API. O Hub apenas entrega configuração e credenciais ao consumidor interno autorizado.

## Segurança

As rotas protegidas exigem simultaneamente `X-Service-Key` e access token JWT emitido pelo Identity. O JWT valida algoritmo, issuer, audience e `tokenType=access`. O contexto `tenantId` é validado quando fornecido, e as permissões são lidas do token dinâmico (`integration:read` e `integration:manage`).

Credenciais nunca são retornadas pelas rotas públicas. Em repouso, são armazenadas em envelope **AES-256-GCM** com `encrypted`, `iv` e `authTag`. A chave `ENCRYPTION_KEY` deve ser hexadecimal de 64 caracteres e deve ser entregue pelo ambiente de execução, nunca pelo Git.

> O endpoint `/api/internal/integrations/:providerKey/active/credentials` é reservado a consumidores backend autenticados com `X-Service-Key` e permissão dinâmica de leitura. Ele não deve ser exposto diretamente a clientes finais.

## Execução local

```bash
cp .env.example .env
npm install
npm run migrate
npm start
```

Por padrão, o serviço escuta na porta `4720`, expõe `/health` e `/ready` e usa o banco `operaon_integration`. O catálogo inicial é seedado de forma idempotente no bootstrap do servidor.

## Backfill legado

O comando `npm run backfill:legacy` é somente-aditivo e possui `BACKFILL_DRY_RUN=true` como padrão. A execução de escrita exige uma conexão explícita com o banco legado, uma chave de cifragem do novo Hub e revisão dos totais do dry-run. O backfill não apaga nem altera registros da API central.

## Cutover

A API central mantém as rotas legadas de integrações. O gateway oferece o namespace paralelo `/api/integration-standalone`, que encaminha para este serviço. A troca deve ocorrer gradualmente por ambiente, tenant ou feature flag. Em caso de falha, basta desativar o adapter ou retornar os consumidores para as rotas legadas; o banco antigo permanece intacto durante a migração.

A especificação técnica versionada está em [`docs/integration-spec.md`](docs/integration-spec.md).

<!-- OPERAON-DOCUMENTATION-LINK -->
## Documentação

A documentação técnica padronizada está em [docs/INDEX.md](docs/INDEX.md). Ela inclui arquitetura, responsabilidades, segurança, contratos, operação, testes, runbooks e decisões.
