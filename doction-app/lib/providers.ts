export type Provider = {
  id: string
  name: string
  specialty: 'Orthodontics' | 'Oral Surgery' | 'Jaw Surgery'
  city: string
  state: string
  basePriceUSD: number
  notes?: string
}

export const PROVIDERS: Provider[] = [
  {
    id: 'p1',
    name: 'Austin Smiles Orthodontics',
    specialty: 'Orthodontics',
    city: 'Austin',
    state: 'TX',
    basePriceUSD: 4800,
    notes: 'Invisalign and traditional braces; free first consult.',
  },
  {
    id: 'p2',
    name: 'Central Texas Oral Surgery',
    specialty: 'Oral Surgery',
    city: 'Austin',
    state: 'TX',
    basePriceUSD: 9800,
    notes: 'Jaw realignment specialists; payment plans available.',
  },
  {
    id: 'p3',
    name: 'LA Precision Jaw Center',
    specialty: 'Jaw Surgery',
    city: 'Los Angeles',
    state: 'CA',
    basePriceUSD: 14500,
    notes: '3D surgical planning; virtual consults.',
  },
  {
    id: 'p4',
    name: 'Bay Area Orthodontics',
    specialty: 'Orthodontics',
    city: 'San Jose',
    state: 'CA',
    basePriceUSD: 5200,
  },
  {
    id: 'p5',
    name: 'Sunset Oral & Maxillofacial',
    specialty: 'Oral Surgery',
    city: 'San Francisco',
    state: 'CA',
    basePriceUSD: 11800,
  },
]
