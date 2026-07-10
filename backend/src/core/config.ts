import { config as dotenvConfig } from 'dotenv'
import { z } from 'zod'
import { resolve } from 'path'

dotenvConfig({ path: resolve(process.cwd(), '.env') })

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  DIAN_DOCUMENT: z.string().min(1, 'DIAN_DOCUMENT is required'),
  DIAN_PASSWORD: z.string().min(1, 'DIAN_PASSWORD is required'),
  PLAYWRIGHT_HEADLESS: z.coerce.boolean().default(true),
  FRONTEND_URL: z.string().default('http://localhost:4321'),
})

export const config = envSchema.parse(process.env)
