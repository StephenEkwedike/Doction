import { connectToDatabase } from '../../database/connection'
import { User, IUser } from '../../database/models/User'
import { IUserDao } from '../interfaces/IUserDao'
import { CreateUserInput, UpdateUserInput } from '../../dto/user.dto'
import { FilterQuery } from 'mongoose'

export class UserDao implements IUserDao {
  async create(userData: CreateUserInput): Promise<IUser> {
    await connectToDatabase()
    const user = new User(userData)
    return await user.save()
  }

  async findById(id: string): Promise<IUser | null> {
    await connectToDatabase()
    return await User.findById(id).exec()
  }

  async findByEmail(email: string): Promise<IUser | null> {
    await connectToDatabase()
    return await User.findOne({ email: email.toLowerCase() }).exec()
  }

  async updateById(id: string, updateData: UpdateUserInput): Promise<IUser | null> {
    await connectToDatabase()
    return await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec()
  }

  async deleteById(id: string): Promise<boolean> {
    await connectToDatabase()
    const result = await User.findByIdAndDelete(id).exec()
    return result !== null
  }

  async findByRole(role: 'patient' | 'provider', limit = 20, offset = 0): Promise<IUser[]> {
    await connectToDatabase()
    return await User.find({ role, isActive: true })
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec()
  }

  async findProvidersBySpecialty(specialty: string, limit = 20, offset = 0): Promise<IUser[]> {
    await connectToDatabase()
    return await User.find({
      role: 'provider',
      isActive: true,
      'providerProfile.specialty': specialty,
      'providerProfile.availableForConsults': true,
    })
      .skip(offset)
      .limit(limit)
      .sort({ 'providerProfile.basePriceUSD': 1 })
      .exec()
  }

  async findProvidersByLocation(city: string, state: string, limit = 20, offset = 0): Promise<IUser[]> {
    await connectToDatabase()
    return await User.find({
      role: 'provider',
      isActive: true,
      'providerProfile.city': { $regex: city, $options: 'i' },
      'providerProfile.state': { $regex: state, $options: 'i' },
      'providerProfile.availableForConsults': true,
    })
      .skip(offset)
      .limit(limit)
      .sort({ 'providerProfile.basePriceUSD': 1 })
      .exec()
  }

  async searchProviders(filters: {
    specialty?: string
    city?: string
    state?: string
    acceptsInsurance?: boolean
    availableForConsults?: boolean
    minPrice?: number
    maxPrice?: number
    limit?: number
    offset?: number
  }): Promise<IUser[]> {
    await connectToDatabase()
    
    const query: FilterQuery<IUser> = {
      role: 'provider',
      isActive: true,
    }

    if (filters.specialty) {
      query['providerProfile.specialty'] = filters.specialty
    }

    if (filters.city) {
      query['providerProfile.city'] = { $regex: filters.city, $options: 'i' }
    }

    if (filters.state) {
      query['providerProfile.state'] = { $regex: filters.state, $options: 'i' }
    }

    if (filters.acceptsInsurance !== undefined) {
      query['providerProfile.acceptsInsurance'] = filters.acceptsInsurance
    }

    if (filters.availableForConsults !== undefined) {
      query['providerProfile.availableForConsults'] = filters.availableForConsults
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query['providerProfile.basePriceUSD'] = {}
      if (filters.minPrice !== undefined) {
        query['providerProfile.basePriceUSD']['$gte'] = filters.minPrice
      }
      if (filters.maxPrice !== undefined) {
        query['providerProfile.basePriceUSD']['$lte'] = filters.maxPrice
      }
    }

    return await User.find(query)
      .skip(filters.offset || 0)
      .limit(filters.limit || 20)
      .sort({ 'providerProfile.basePriceUSD': 1 })
      .exec()
  }

  async existsByEmail(email: string): Promise<boolean> {
    await connectToDatabase()
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id').exec()
    return user !== null
  }

  async countByRole(role: 'patient' | 'provider'): Promise<number> {
    await connectToDatabase()
    return await User.countDocuments({ role, isActive: true }).exec()
  }

  async getActiveProvidersCount(): Promise<number> {
    await connectToDatabase()
    return await User.countDocuments({
      role: 'provider',
      isActive: true,
      'providerProfile.availableForConsults': true,
    }).exec()
  }

  async updateLastActive(id: string): Promise<void> {
    await connectToDatabase()
    await User.findByIdAndUpdate(id, {
      $set: { lastActiveAt: new Date() }
    }).exec()
  }
}