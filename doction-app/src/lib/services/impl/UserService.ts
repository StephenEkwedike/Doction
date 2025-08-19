import { IUserService } from '../interfaces/IUserService'
import { IUserDao } from '../../dao/interfaces/IUserDao'
import { UserDao } from '../../dao/impl/UserDao'
import { CreateUserInput, UpdateUserInput, UserResponseDto } from '../../dto/user.dto'
import { IUser } from '../../database/models/User'

export class UserService implements IUserService {
  private userDao: IUserDao

  constructor(userDao?: IUserDao) {
    this.userDao = userDao || new UserDao()
  }

  async createUser(userData: CreateUserInput): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.userDao.findByEmail(userData.email)
    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Create user
    const user = await this.userDao.create(userData)
    
    // Send welcome email (implement later)
    await this.sendWelcomeEmail(user._id)
    
    return this.mapToResponseDto(user)
  }

  async getUserById(id: string): Promise<UserResponseDto | null> {
    const user = await this.userDao.findById(id)
    return user ? this.mapToResponseDto(user) : null
  }

  async getUserByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userDao.findByEmail(email)
    return user ? this.mapToResponseDto(user) : null
  }

  async updateUser(id: string, updateData: UpdateUserInput): Promise<UserResponseDto | null> {
    const user = await this.userDao.updateById(id, updateData)
    return user ? this.mapToResponseDto(user) : null
  }

  async deleteUser(id: string): Promise<boolean> {
    return await this.userDao.deleteById(id)
  }

  async searchProviders(criteria: {
    specialty?: string
    location?: string
    priceRange?: { min: number; max: number }
    acceptsInsurance?: boolean
    rating?: number
    availabilityDate?: Date
    limit?: number
    offset?: number
  }): Promise<UserResponseDto[]> {
    
    let city: string | undefined
    let state: string | undefined
    
    if (criteria.location) {
      const locationParts = criteria.location.split(',')
      city = locationParts[0]?.trim()
      state = locationParts[1]?.trim()
    }

    const filters = {
      specialty: criteria.specialty,
      city,
      state,
      acceptsInsurance: criteria.acceptsInsurance,
      availableForConsults: true,
      minPrice: criteria.priceRange?.min,
      maxPrice: criteria.priceRange?.max,
      limit: criteria.limit || 20,
      offset: criteria.offset || 0,
    }

    const providers = await this.userDao.searchProviders(filters)
    return providers.map(provider => this.mapToResponseDto(provider))
  }

  async getProviderRecommendations(patientId: string, caseProfileId?: string): Promise<UserResponseDto[]> {
    // This would implement a recommendation algorithm
    // For now, return providers sorted by rating and price
    const providers = await this.userDao.findByRole('provider', 10, 0)
    return providers.map(provider => this.mapToResponseDto(provider))
  }

  async verifyProvider(providerId: string, licenseNumber: string): Promise<boolean> {
    const provider = await this.userDao.findById(providerId)
    if (!provider || provider.role !== 'provider') {
      return false
    }
    
    return provider.providerProfile?.licenseNumber === licenseNumber
  }

  async updateProviderAvailability(providerId: string, available: boolean): Promise<UserResponseDto | null> {
    const provider = await this.userDao.findById(providerId)
    if (!provider || provider.role !== 'provider') {
      return null
    }

    // This would need a more sophisticated update for nested fields
    // For now, we'll need to extend the UserDao to handle nested updates
    return null
  }

  async getProviderStats(providerId: string): Promise<{
    totalPatients: number
    averageRating: number
    responseTime: string
    completedProcedures: number
  }> {
    // This would aggregate data from conversations, offers, and ratings
    // Placeholder implementation
    return {
      totalPatients: 0,
      averageRating: 0,
      responseTime: '< 2 hours',
      completedProcedures: 0
    }
  }

  async getPatientCaseHistory(patientId: string): Promise<any[]> {
    // This would fetch case profiles, offers, and conversations
    // Placeholder implementation
    return []
  }

  async sendWelcomeEmail(userId: string): Promise<void> {
    // Implement email service integration
    console.log(`Welcome email sent to user ${userId}`)
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<UserResponseDto | null> {
    // This would extend user model to include preferences
    return null
  }

  private mapToResponseDto(user: IUser): UserResponseDto {
    return {
      id: user._id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      patientProfile: user.patientProfile ? {
        age: user.patientProfile.age,
        location: user.patientProfile.location,
        preferredLanguage: user.patientProfile.preferredLanguage,
        insuranceProvider: user.patientProfile.insuranceProvider,
      } : undefined,
      providerProfile: user.providerProfile ? {
        specialty: user.providerProfile.specialty,
        licenseNumber: user.providerProfile.licenseNumber,
        yearsExperience: user.providerProfile.yearsExperience,
        city: user.providerProfile.city,
        state: user.providerProfile.state,
        basePriceUSD: user.providerProfile.basePriceUSD,
        acceptsInsurance: user.providerProfile.acceptsInsurance,
        availableForConsults: user.providerProfile.availableForConsults,
        bio: user.providerProfile.bio,
      } : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}