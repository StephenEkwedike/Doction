import { z } from 'zod'

const DatabaseConfigSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  DB_NAME: z.string().default('doction'),
  DB_POOL_SIZE: z.coerce.number().default(10),
  DB_TIMEOUT: z.coerce.number().default(10000),
})

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>

export const getDatabaseConfig = (): DatabaseConfig => {
  const config = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/doction',
    DB_NAME: process.env.DB_NAME || 'doction',
    DB_POOL_SIZE: process.env.DB_POOL_SIZE || '10',
    DB_TIMEOUT: process.env.DB_TIMEOUT || '10000',
  }

  return DatabaseConfigSchema.parse(config)
}