import { z } from 'zod'

export const RutRequestSchema = z.object({
  cedula: z.string().regex(/^\d{6,10}$/, 'Cédula debe ser numérica de 6-10 dígitos'),
})

export const RutResponseSchema = z.object({
  status: z.enum(['success', 'failed']),
  rut_exists: z.boolean().nullable(),
  data: z.object({
    cedula_consultada: z.string(),
    contenido_confirmado: z.string(),
  }).nullable(),
  message: z.string(),
  duration_ms: z.number(),
})

export type RutRequest = z.infer<typeof RutRequestSchema>
export type RutResponse = z.infer<typeof RutResponseSchema>
