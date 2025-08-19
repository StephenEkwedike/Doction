'use client'

export function PurpleOrb() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mb-6 h-16 w-16 rounded-full opacity-90 animate-pulse"
      style={{
        background:
          'radial-gradient(circle at 30% 30%, #1DA1F2 0%, rgba(29,161,242,0) 60%), radial-gradient(circle at 70% 70%, #0EA5E9 0%, rgba(14,165,233,0) 60%)',
      }}
    />
  )
}
