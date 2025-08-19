'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Clock, 
  User, 
  MapPin, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageCircle,
  Calendar
} from 'lucide-react'
import { useAuthStore } from '@/src/stores/authStore'

interface PatientRequest {
  id: string
  patientName: string
  patientAvatar?: string
  specialty: string
  urgency: 'low' | 'medium' | 'high'
  description: string
  location?: string
  budgetRange?: { min: number; max: number }
  preferredDate?: Date
  createdAt: Date
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  metadata: {
    hasInsurance?: boolean
    previousTreatments?: string[]
    additionalNotes?: string
  }
}

// Mock data for demonstration
const MOCK_REQUESTS: PatientRequest[] = [
  {
    id: 'req-1',
    patientName: 'Sarah Johnson',
    patientAvatar: '/avatars/patient-1.jpg',
    specialty: 'Orthodontics',
    urgency: 'high',
    description: 'I need an orthodontist for my teenage daughter. She has severe crowding and an overbite. Looking for Invisalign or traditional braces consultation.',
    location: 'Austin, TX',
    budgetRange: { min: 4000, max: 6000 },
    preferredDate: new Date('2024-12-15'),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'pending',
    metadata: {
      hasInsurance: true,
      additionalNotes: 'Daughter is 15 years old. We have Delta Dental insurance.'
    }
  },
  {
    id: 'req-2',
    patientName: 'Michael Chen',
    specialty: 'Orthodontics',
    urgency: 'medium',
    description: 'Adult looking for discreet teeth straightening options. Work in corporate environment, so appearance is important during treatment.',
    location: 'Austin, TX',
    budgetRange: { min: 5000, max: 8000 },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    status: 'pending',
    metadata: {
      hasInsurance: false,
      additionalNotes: 'Prefer clear aligners. Willing to pay more for faster treatment.'
    }
  },
  {
    id: 'req-3',
    patientName: 'Emma Davis',
    specialty: 'Orthodontics',
    urgency: 'low',
    description: 'Interested in consultation for minor teeth alignment issues. Not urgent, but want to explore options.',
    location: 'Round Rock, TX',
    budgetRange: { min: 3000, max: 5000 },
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    status: 'pending',
    metadata: {
      hasInsurance: true,
      additionalNotes: 'Flexible with timing. Looking for best value option.'
    }
  }
]

export function ProviderRequests() {
  const { user } = useAuthStore()
  const [requests, setRequests] = useState<PatientRequest[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent'>('pending')

  useEffect(() => {
    // Filter requests based on provider specialty
    const providerSpecialty = user?.providerProfile?.specialty
    if (providerSpecialty) {
      const filteredRequests = MOCK_REQUESTS.filter(req => 
        req.specialty === providerSpecialty
      )
      setRequests(filteredRequests)
    }
  }, [user])

  const handleRequestAction = async (requestId: string, action: 'accept' | 'decline') => {
    // Update request status
    setRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { ...req, status: action === 'accept' ? 'accepted' : 'declined' }
          : req
      )
    )

    // TODO: Send notification to patient
    // TODO: Create conversation if accepted
    console.log(`${action} request ${requestId}`)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'declined': return <XCircle className="w-4 h-4 text-red-600" />
      case 'expired': return <Clock className="w-4 h-4 text-gray-400" />
      default: return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    }
  }

  const filteredRequests = requests.filter(req => {
    if (filter === 'pending') return req.status === 'pending'
    if (filter === 'urgent') return req.urgency === 'high' && req.status === 'pending'
    return true
  })

  if (!user?.providerProfile) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Provider profile not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Requests</h1>
          <p className="text-gray-600 mt-1">
            New consultation requests for {user.providerProfile.specialty}
          </p>
        </div>
        
        {/* Filter buttons */}
        <div className="flex gap-2">
          {[
            { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
            { key: 'urgent', label: 'Urgent', count: requests.filter(r => r.urgency === 'high' && r.status === 'pending').length },
            { key: 'all', label: 'All', count: requests.length },
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(key as any)}
              className="relative"
            >
              {label}
              {count > 0 && (
                <Badge className="ml-2 bg-sky-600 hover:bg-sky-700 text-white px-1.5 py-0.5 text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
              <p className="text-gray-600">
                Patient requests matching your specialty will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.patientAvatar} alt={request.patientName} />
                      <AvatarFallback>
                        {request.patientName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{request.patientName}</h3>
                        <Badge className={getUrgencyColor(request.urgency)}>
                          {request.urgency}
                        </Badge>
                        {getStatusIcon(request.status)}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant="outline">{request.specialty}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <div>
                  <p className="text-gray-900 leading-relaxed">{request.description}</p>
                </div>

                {/* Request Details */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {request.location && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {request.location}
                    </div>
                  )}
                  
                  {request.budgetRange && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      ${request.budgetRange.min.toLocaleString()} - ${request.budgetRange.max.toLocaleString()}
                    </div>
                  )}

                  {request.preferredDate && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Preferred: {request.preferredDate.toLocaleDateString()}
                    </div>
                  )}

                  {request.metadata.hasInsurance && (
                    <Badge variant="secondary" className="text-xs">
                      Has Insurance
                    </Badge>
                  )}
                </div>

                {/* Additional Notes */}
                {request.metadata.additionalNotes && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Notes:</strong> {request.metadata.additionalNotes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleRequestAction(request.id, 'accept')}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept & Message
                    </Button>
                    <Button
                      onClick={() => handleRequestAction(request.id, 'decline')}
                      variant="outline"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                    <Button variant="outline" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                )}

                {request.status === 'accepted' && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Request accepted. Patient has been notified and conversation created.
                    </p>
                  </div>
                )}

                {request.status === 'declined' && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm text-red-800">
                      ❌ Request declined. Patient has been notified.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}