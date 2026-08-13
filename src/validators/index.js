const { z } = require('zod');

const key = z.string().trim().min(2).max(100).regex(/^[a-z][a-z0-9._-]*$/, 'key inválida');
const environment = z.string().trim().min(1).max(40).regex(/^[a-z][a-z0-9_-]*$/);
const credentials = z.record(z.any()).refine((value) => Object.keys(value).length > 0, 'credentials não pode ser vazio');
const jsonObject = z.record(z.any()).nullable().optional();

const providerCreateSchema = z.object({
  key,
  displayName: z.string().trim().min(2).max(160),
  description: z.string().max(5000).nullable().optional(),
  category: z.string().trim().min(2).max(80).default('external'),
  supportedEnvironments: z.array(environment).min(1).default(['sandbox', 'production']),
  credentialSchema: jsonObject,
  configSchema: jsonObject,
  healthCheck: jsonObject,
  isActive: z.boolean().optional(),
});

const providerPatchSchema = providerCreateSchema.partial().omit({ key: true });

const integrationCreateSchema = z.object({
  providerKey: key,
  environment,
  label: z.string().trim().min(2).max(160),
  credentials,
  config: jsonObject,
  isActive: z.boolean().optional(),
});

const integrationPatchSchema = integrationCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, 'Nenhum campo para atualizar');
const paginationSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).optional(), offset: z.coerce.number().int().min(0).optional(), activeOnly: z.coerce.boolean().optional() });
const internalParamsSchema = z.object({ providerKey: key });

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Dados inválidos');
    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.flatten();
    throw error;
  }
  return result.data;
};

module.exports = { providerCreateSchema, providerPatchSchema, integrationCreateSchema, integrationPatchSchema, paginationSchema, internalParamsSchema, parse };
