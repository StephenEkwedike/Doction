import { User } from '@/src/types'

export const MOCK_PROVIDERS: User[] = [
  // Orthodontists
  {
    id: 'ortho-1',
    email: 'dr.smith@austinortho.com',
    name: 'Dr. Sarah Smith',
    phone: '+1 (512) 555-0101',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-smith.jpg',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'Orthodontics',
      licenseNumber: 'TX-ORTHO-12345',
      yearsExperience: 12,
      city: 'Austin',
      state: 'TX',
      basePriceUSD: 4800,
      acceptsInsurance: true,
      availableForConsults: true,
      bio: 'Specializing in Invisalign and traditional braces. Board-certified orthodontist with over 12 years of experience helping patients achieve perfect smiles.',
      rating: 4.9,
      responseTime: '< 2 hours'
    }
  },
  {
    id: 'ortho-2',
    email: 'dr.johnson@texasortho.com',
    name: 'Dr. Michael Johnson',
    phone: '+1 (512) 555-0102',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-johnson.jpg',
    createdAt: new Date('2022-08-20'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'Orthodontics',
      licenseNumber: 'TX-ORTHO-23456',
      yearsExperience: 8,
      city: 'Austin',
      state: 'TX',
      basePriceUSD: 4200,
      acceptsInsurance: true,
      availableForConsults: true,
      bio: 'Modern orthodontics with digital planning. Specializes in adult orthodontics and accelerated treatment options.',
      rating: 4.7,
      responseTime: '< 4 hours'
    }
  },
  {
    id: 'ortho-3',
    email: 'dr.davis@bayareaortho.com',
    name: 'Dr. Jennifer Davis',
    phone: '+1 (408) 555-0201',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-davis.jpg',
    createdAt: new Date('2021-03-10'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'Orthodontics',
      licenseNumber: 'CA-ORTHO-34567',
      yearsExperience: 15,
      city: 'San Jose',
      state: 'CA',
      basePriceUSD: 5800,
      acceptsInsurance: false,
      availableForConsults: true,
      bio: 'Silicon Valley orthodontist specializing in cutting-edge clear aligner technology and 3D digital treatment planning.',
      rating: 4.8,
      responseTime: '< 1 hour'
    }
  },

  // Oral Surgeons
  {
    id: 'oral-1',
    email: 'dr.wilson@centraltexasoral.com',
    name: 'Dr. Robert Wilson',
    phone: '+1 (512) 555-0301',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-wilson.jpg',
    createdAt: new Date('2020-11-05'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'Oral Surgery',
      licenseNumber: 'TX-ORAL-45678',
      yearsExperience: 18,
      city: 'Austin',
      state: 'TX',
      basePriceUSD: 9800,
      acceptsInsurance: true,
      availableForConsults: true,
      bio: 'Board-certified oral and maxillofacial surgeon. Expertise in wisdom teeth removal, dental implants, and corrective jaw surgery.',
      rating: 4.9,
      responseTime: '< 3 hours'
    }
  },
  {
    id: 'oral-2',
    email: 'dr.garcia@laoralsurgery.com',
    name: 'Dr. Maria Garcia',
    phone: '+1 (323) 555-0401',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-garcia.jpg',
    createdAt: new Date('2019-06-12'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'Oral Surgery',
      licenseNumber: 'CA-ORAL-56789',
      yearsExperience: 22,
      city: 'Los Angeles',
      state: 'CA',
      basePriceUSD: 12500,
      acceptsInsurance: true,
      availableForConsults: true,
      bio: 'Renowned oral surgeon specializing in complex reconstructive procedures and TMJ disorders. Fluent in Spanish.',
      rating: 4.8,
      responseTime: '< 2 hours'
    }
  },

  // Jaw Surgeons
  {
    id: 'jaw-1',
    email: 'dr.chen@laprecisionjaw.com',
    name: 'Dr. David Chen',
    phone: '+1 (310) 555-0501',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-chen.jpg',
    createdAt: new Date('2018-09-22'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'Jaw Surgery',
      licenseNumber: 'CA-JAW-67890',
      yearsExperience: 25,
      city: 'Los Angeles',
      state: 'CA',
      basePriceUSD: 18500,
      acceptsInsurance: false,
      availableForConsults: true,
      bio: 'Leading orthognathic surgeon specializing in 3D surgical planning and computer-guided jaw reconstruction.',
      rating: 5.0,
      responseTime: '< 6 hours'
    }
  },
  {
    id: 'jaw-2',
    email: 'dr.thompson@sfmaxfacial.com',
    name: 'Dr. Lisa Thompson',
    phone: '+1 (415) 555-0601',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-thompson.jpg',
    createdAt: new Date('2017-12-03'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'Jaw Surgery',
      licenseNumber: 'CA-JAW-78901',
      yearsExperience: 20,
      city: 'San Francisco',
      state: 'CA',
      basePriceUSD: 16800,
      acceptsInsurance: true,
      availableForConsults: true,
      bio: 'Expert in corrective jaw surgery and facial reconstruction. Fellowship trained in orthognathic and TMJ surgery.',
      rating: 4.9,
      responseTime: '< 4 hours'
    }
  },

  // General Dentists with surgical capabilities
  {
    id: 'general-1',
    email: 'dr.martinez@moderndental.com',
    name: 'Dr. Carlos Martinez',
    phone: '+1 (512) 555-0701',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-martinez.jpg',
    createdAt: new Date('2022-02-14'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'General Dentistry',
      licenseNumber: 'TX-DDS-89012',
      yearsExperience: 10,
      city: 'Austin',
      state: 'TX',
      basePriceUSD: 3200,
      acceptsInsurance: true,
      availableForConsults: true,
      bio: 'Modern general dentistry with a focus on preventive care and cosmetic procedures. Certified in conscious sedation.',
      rating: 4.6,
      responseTime: '< 1 hour'
    }
  },
  {
    id: 'general-2',
    email: 'dr.patel@siliconsmiles.com',
    name: 'Dr. Priya Patel',
    phone: '+1 (650) 555-0801',
    role: 'provider',
    isActive: true,
    avatar: '/avatars/dr-patel.jpg',
    createdAt: new Date('2021-07-18'),
    updatedAt: new Date('2024-12-01'),
    patientProfile: undefined,
    providerProfile: {
      specialty: 'General Dentistry',
      licenseNumber: 'CA-DDS-90123',
      yearsExperience: 14,
      city: 'Palo Alto',
      state: 'CA',
      basePriceUSD: 4500,
      acceptsInsurance: false,
      availableForConsults: true,
      bio: 'Tech-forward dental practice specializing in digital dentistry and same-day procedures. Fluent in Hindi and Gujarati.',
      rating: 4.7,
      responseTime: '< 2 hours'
    }
  }
]

// Helper functions for provider matching
export const getProvidersBySpecialty = (specialty: string): User[] => {
  return MOCK_PROVIDERS.filter(provider => 
    provider.providerProfile?.specialty.toLowerCase().includes(specialty.toLowerCase())
  )
}

export const getProvidersByLocation = (city?: string, state?: string): User[] => {
  return MOCK_PROVIDERS.filter(provider => {
    const profile = provider.providerProfile
    if (!profile) return false
    
    const cityMatch = !city || profile.city.toLowerCase().includes(city.toLowerCase())
    const stateMatch = !state || profile.state.toLowerCase().includes(state.toLowerCase())
    
    return cityMatch && stateMatch
  })
}

export const getProvidersInPriceRange = (minPrice: number, maxPrice: number): User[] => {
  return MOCK_PROVIDERS.filter(provider => {
    const price = provider.providerProfile?.basePriceUSD
    return price && price >= minPrice && price <= maxPrice
  })
}

export const searchProviders = (query: string): User[] => {
  const searchTerm = query.toLowerCase()
  
  return MOCK_PROVIDERS.filter(provider => {
    const profile = provider.providerProfile
    if (!profile) return false
    
    return (
      provider.name.toLowerCase().includes(searchTerm) ||
      profile.specialty.toLowerCase().includes(searchTerm) ||
      profile.city.toLowerCase().includes(searchTerm) ||
      profile.state.toLowerCase().includes(searchTerm) ||
      profile.bio?.toLowerCase().includes(searchTerm)
    )
  })
}