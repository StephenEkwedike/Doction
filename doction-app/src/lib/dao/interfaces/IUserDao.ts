import { IUser } from '../../database/models/User'
import { CreateUserInput, UpdateUserInput } from '../../dto/user.dto'

export interface IUserDao {
  /**
   * Create a new user
   */
  create(userData: CreateUserInput): Promise<IUser>

  /**
   * Find user by ID
   */
  findById(id: string): Promise<IUser | null>

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<IUser | null>

  /**
   * Update user by ID
   */
  updateById(id: string, updateData: UpdateUserInput): Promise<IUser | null>

  /**
   * Delete user by ID
   */
  deleteById(id: string): Promise<boolean>

  /**
   * Find users by role with pagination
   */
  findByRole(role: 'patient' | 'provider', limit?: number, offset?: number): Promise<IUser[]>

  /**
   * Find providers by specialty
   */
  findProvidersBySpecialty(specialty: string, limit?: number, offset?: number): Promise<IUser[]>

  /**
   * Find providers by location
   */
  findProvidersByLocation(city: string, state: string, limit?: number, offset?: number): Promise<IUser[]>

  /**
   * Search providers with multiple filters
   */
  searchProviders(filters: {
    specialty?: string
    city?: string
    state?: string
    acceptsInsurance?: boolean
    availableForConsults?: boolean
    minPrice?: number
    maxPrice?: number
    limit?: number
    offset?: number
  }): Promise<IUser[]>

  /**
   * Check if user exists by email
   */
  existsByEmail(email: string): Promise<boolean>

  /**
   * Get user count by role
   */
  countByRole(role: 'patient' | 'provider'): Promise<number>

  /**
   * Get active providers count
   */
  getActiveProvidersCount(): Promise<number>

  /**
   * Update user's last active timestamp
   */
  updateLastActive(id: string): Promise<void>
}