import { IOffer } from '../../database/models/Offer'
import { CreateOfferInput, UpdateOfferInput, OfferSearchInput } from '../../dto/offer.dto'

export interface IOfferDao {
  /**
   * Create a new offer
   */
  create(offerData: CreateOfferInput): Promise<IOffer>

  /**
   * Find offer by ID with populated data
   */
  findById(id: string): Promise<IOffer | null>

  /**
   * Find offers for a patient
   */
  findByPatientId(patientId: string, limit?: number, offset?: number): Promise<IOffer[]>

  /**
   * Find offers by provider
   */
  findByProviderId(providerId: string, limit?: number, offset?: number): Promise<IOffer[]>

  /**
   * Search offers with filters
   */
  search(filters: OfferSearchInput): Promise<IOffer[]>

  /**
   * Update offer
   */
  updateById(id: string, updateData: UpdateOfferInput): Promise<IOffer | null>

  /**
   * Accept an offer
   */
  acceptOffer(offerId: string): Promise<IOffer | null>

  /**
   * Decline an offer
   */
  declineOffer(offerId: string): Promise<IOffer | null>

  /**
   * Delete offer
   */
  deleteById(id: string): Promise<boolean>

  /**
   * Get pending offers for patient
   */
  getPendingOffersByPatient(patientId: string): Promise<IOffer[]>

  /**
   * Get accepted offers for patient
   */
  getAcceptedOffersByPatient(patientId: string): Promise<IOffer[]>

  /**
   * Get pending offers by provider
   */
  getPendingOffersByProvider(providerId: string): Promise<IOffer[]>

  /**
   * Get offers by specialty
   */
  getOffersBySpecialty(specialty: string, limit?: number, offset?: number): Promise<IOffer[]>

  /**
   * Get offers expiring soon
   */
  getExpiringOffers(daysThreshold?: number): Promise<IOffer[]>

  /**
   * Mark expired offers
   */
  markExpiredOffers(): Promise<number>

  /**
   * Get offers in price range
   */
  getOffersInPriceRange(minPrice: number, maxPrice: number, limit?: number): Promise<IOffer[]>

  /**
   * Get offers by location
   */
  getOffersByLocation(city: string, state: string, limit?: number): Promise<IOffer[]>

  /**
   * Get offer statistics for provider
   */
  getProviderOfferStats(providerId: string): Promise<{
    totalOffers: number
    pendingOffers: number
    acceptedOffers: number
    declinedOffers: number
    averagePrice: number
  }>

  /**
   * Get offer statistics for patient
   */
  getPatientOfferStats(patientId: string): Promise<{
    totalOffers: number
    pendingOffers: number
    acceptedOffers: number
    averageSavings: number
  }>

  /**
   * Get matching offers for case profile
   */
  getMatchingOffers(caseProfileId: string): Promise<IOffer[]>

  /**
   * Bulk create offers
   */
  createMany(offers: CreateOfferInput[]): Promise<IOffer[]>
}