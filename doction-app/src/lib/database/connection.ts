import mongoose from 'mongoose'
import { getDatabaseConfig } from '../config/database.config'

interface MongoConnection {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Global variable for caching the connection in serverless environments
let cached: MongoConnection = {
  conn: null,
  promise: null,
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Return cached connection if it exists
  if (cached.conn) {
    return cached.conn
  }

  // If no connection promise exists, create one
  if (!cached.promise) {
    const config = getDatabaseConfig()
    
    const opts = {
      maxPoolSize: config.DB_POOL_SIZE,
      serverSelectionTimeoutMS: config.DB_TIMEOUT,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
    }

    cached.promise = mongoose.connect(config.MONGODB_URI, opts)
  }

  try {
    cached.conn = await cached.promise
    console.log('✅ Connected to MongoDB:', cached.conn.connection.name)
  } catch (error) {
    cached.promise = null
    console.error('❌ MongoDB connection error:', error)
    throw error
  }

  return cached.conn
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect()
    cached.conn = null
    cached.promise = null
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (error) => {
  console.error('🔴 Mongoose connection error:', error)
})

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB')
})