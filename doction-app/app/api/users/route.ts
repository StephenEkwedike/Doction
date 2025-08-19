import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/src/lib/services/impl/UserService'
import { CreateUserSchema } from '@/src/lib/dto/user.dto'
import { connectToDatabase } from '@/src/lib/database/connection'

const userService = new UserService()

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()
    
    const body = await req.json()
    
    // Validate request body
    const validation = CreateUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Create user
    const user = await userService.createUser(validation.data)
    
    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    
    if (error.message === 'User with this email already exists') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const id = searchParams.get('id')

    if (email) {
      const user = await userService.getUserByEmail(email)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json(user)
    }

    if (id) {
      const user = await userService.getUserById(id)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json(user)
    }

    return NextResponse.json({ error: 'Email or ID parameter required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}