'use client'

export function IntakeHints({
  onPick,
}: {
  onPick: (prompt: string) => void
}) {
  const chips = [
    'I’m looking for jaw surgery options',
    'I have an orthodontic quote to compare',
    'I want braces or aligners and a second opinion',
    'Open to travel if it’s significantly cheaper',
  ]
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-6">
      {chips.map((c) => (
        <button
          key={c}
          className="px-3 py-1.5 text-sm rounded-full border border-gray-200 hover:border-sky-300 hover:bg-sky-50 text-gray-700"
          onClick={() => onPick(c)}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
