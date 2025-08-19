import { CreateUserInput, UpdateUserInput, UserResponseDto } from '../../dto/user.dto'

export interface IUserService {
  /**
   * Create a new user with validation
   */
  createUser(userData: CreateUserInput): Promise<UserResponseDto>

  /**
   * Get user by ID
   */
  getUserById(id: string): Promise<UserResponseDto | null>

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<UserResponseDto | null>

  /**
   * Update user profile
   */
  updateUser(id: string, updateData: UpdateUserInput): Promise<UserResponseDto | null>

  /**
   * Delete user account
   */
  deleteUser(id: string): Promise<boolean>

  /**
   * Search providers with advanced filtering
   */
  searchProviders(criteria: {
    specialty?: string
    location?: string
    priceRange?: { min: number; max: number }
    acceptsInsurance?: boolean
    rating?: number
    availabilityDate?: Date
    limit?: number
    offset?: number
  }): Promise<UserResponseDto[]>

  /**
   * Get provider recommendations for a patient
   */
  getProviderRecommendations(patientId: string, caseProfileId?: string): Promise<UserResponseDto[]>

  /**
   * Verify provider credentials
   */
  verifyProvider(providerId: string, licenseNumber: string): Promise<boolean>

  /**
   * Update provider availability
   */
  updateProviderAvailability(providerId: string, available: boolean): Promise<UserResponseDto | null>

  /**
   * Get provider statistics
   */
  getProviderStats(providerId: string): Promise<{
    totalPatients: number
    averageRating: number
    responseTime: string
    completedProcedures: number
  }>

  /**
   * Get patient case history
   */
  getPatientCaseHistory(patientId: string): Promise<any[]>

  /**
   * Send welcome email to new user
   */
  sendWelcomeEmail(userId: string): Promise<void>

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: any): Promise<UserResponseDto | null>
}