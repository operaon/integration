# Integration Hub — especificação técnica inicial

## Objetivo

O Integration Hub é o standalone responsável pelo catálogo de providers, ambientes, integrações administrativas, credenciais cifradas, configuração não sensível, resolução do ambiente ativo, adapters de health check e auditoria das alterações. O primeiro corte preserva a compatibilidade com a tabela global legada, que não possui `tenantId`.

## Fronteira

O serviço será dono de `integration_providers`, `integrations` e `integration_audit_events` no banco `operaon_integration`. O catálogo de providers é dinâmico e não depende de ENUM no código; novos providers podem ser cadastrados e configurados via banco, respeitando o contrato de schema e as permissões dinâmicas do Identity.

No primeiro corte ficam fora do serviço os tokens de login Google, sessões OAuth do Identity, criação de reuniões Zoom/Google/Jitsi, regras de negócio dos demais domínios, execução de webhooks de domínio e secrets de runtime que não estejam cadastrados explicitamente como Integration. O Integration Hub não executa regras de negócio dos providers; ele armazena, resolve e testa conexões configuradas.

## Segurança

As rotas administrativas e internas exigem simultaneamente `X-Service-Key` e access token JWT emitido pelo Identity. O token valida algoritmo, issuer, audience exclusiva `operaon-integration` e `tokenType=access`. As permissões administrativas são dinâmicas e usam exclusivamente o formato `integration:read` e `integration:manage`; tokens de serviço não recebem privilégio implícito e devem carregar a permissão necessária.

Credenciais são armazenadas em envelope versionado AES-256-GCM no Integration Hub. A `ENCRYPTION_KEY` permanece exclusivamente no ambiente do serviço e nunca é enviada pelo gateway ou retornada nas respostas públicas. Auditoria registra somente campos não sensíveis; material de credential, tokens, passwords e secrets são redacted.

## Contrato HTTP

| Método | Rota | Finalidade | Permissão |
|---|---|---|---|
| `GET` | `/health` | Saúde básica do processo | Pública |
| `GET` | `/ready` | Banco e readiness | Pública |
| `GET` | `/api/integrations` | Lista pública administrativa sem credenciais | `integration:read` |
| `GET` | `/api/integrations/:id` | Consulta sem credenciais | `integration:read` |
| `POST` | `/api/integrations` | Cria integração cifrando credenciais | `integration:manage` |
| `PATCH` | `/api/integrations/:id` | Atualiza configuração e/ou credenciais | `integration:manage` |
| `DELETE` | `/api/integrations/:id` | Desativa/remover integração | `integration:manage` |
| `POST` | `/api/integrations/:id/test` | Executa health check registrado | `integration:manage` |
| `GET` | `/api/internal/integrations/:provider/active` | Consulta configuração ativa para consumidor confiável | `integration:read` |
| `GET` | `/api/providers` | Catálogo de providers ativos | `integration:read` |
| `POST` | `/api/providers` | Cadastra ou atualiza provider | `integration:manage` |

O payload administrativo pode receber `credentials`, mas a resposta sempre substitui esse campo por `credentialsConfigured: true|false`. O endpoint interno retorna credenciais descriptografadas somente para um consumidor autenticado com chave de serviço válida e rota explícita; o gateway não deve repassar esse payload diretamente ao cliente.

## Resolução de ambiente

A resolução de integração ativa consulta o banco. Para cada `providerKey`, deve existir no máximo uma integração ativa. Zero integrações ativas gera erro explícito; mais de uma integração ativa gera conflito e exige desativação administrativa. O serviço não usa fallback silencioso para variáveis de ambiente nem presume `production`.

## Migração e cutover

O backfill é somente-aditivo e idempotente. Ele lê a tabela central, valida a descriptografia com a chave atual, reempacota o conteúdo no envelope do Hub e compara contagens sem apagar ou bloquear a origem. O gateway opera com adapter gradual e fallback de leitura para o legado durante a janela de observação. Após a validação, novas escritas passam exclusivamente pelo Hub; a tabela central permanece somente leitura até o encerramento formal do rollback.

## Opções consideradas

| Abordagem | Trade-offs | Custo | Complexidade |
|---|---|---|---|
| Cofre independente com adapter compatível | Cria fronteira própria, mantém rollback e reutiliza PostgreSQL/HTTP | Baixo a médio | Média |
| Facade mantendo dados na API | Implementação inicial menor, mas não remove acoplamento | Baixo inicial, alto contínuo | Baixa inicial, alta depois |
| Vault/KMS desde o primeiro corte | Melhor rotação, mas exige infraestrutura e ACLs adicionais | Médio a alto | Alta |

A implementação adota o **cofre independente com adapter compatível**. A decisão permanece reversível porque consumidores ainda podem voltar ao legado e o contrato HTTP não depende do backend criptográfico.
