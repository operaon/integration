# Documentação — Integration Hub

> **Status:** documentação versionada em Docs as Code. **Owner:** Integration Hub. **Branch:** main.

Este índice organiza a documentação oficial do repositório [Integration Hub][1]. A documentação global define os padrões; este repositório registra somente responsabilidades, contratos e procedimentos específicos.

## Visão rápida

| Campo | Valor |
| --- | --- |
| Repositório | `integration` |
| Tipo | module |
| Responsabilidade | Conectores externos, credenciais de integração, health checks e orquestração de integrações. |
| Porta declarada | 4720 |
| Banco próprio | Sim, conforme configuração do serviço |
| Entrada oficial | Gateway ou serviço autorizado |

## Documentos

- [Contrato do módulo](module-contract.md)
- [API e endpoints](api.md)
- [Eventos e integrações](events.md)
- [Segurança](security.md)
- [Operação](operations.md)
- [Testes](testing.md)
- [Runbook de saúde](runbooks/health-and-readiness.md)
- [Decisões arquiteturais](decisions/ADR-0001-documentation-standard.md)

## Princípios

Segredos de provedores ficam fora do código; integrações devem possuir timeout, retry, circuit breaker e auditoria.

A regra de ownership é obrigatória: comandos que alteram estado devem ser enviados ao owner do domínio; eventos informam mudanças após commit; consultas não transferem ownership.

## Referências

[1]: https://github.com/operaon/integration "Repositório Integration Hub"
[2]: https://github.com/operaon/api "API Gateway Operaon"
[3]: https://github.com/operaon/identity "Identity Operaon"
