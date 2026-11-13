import type { QuranWord } from '@scratch-pages/api-contracts/quran'

type Availability = NonNullable<QuranWord['availability']>

export const wordAvailabilitySources = [
  { key: 'corpus', label: 'Corpus' },
  { key: 'lane', label: 'Lane' },
  { key: 'mufradat', label: 'Mufradāt' },
] as const

const statuses = {
  lexical: { available: true, label: 'Available' },
  grammar_only: { available: true, label: 'Grammar only' },
  indexed: { available: true, label: 'Indexed' },
  multiple: { available: true, label: 'Multiple indexed matches' },
  missing: { available: false, label: 'No indexed match' },
  unknown: { available: false, label: 'Unknown' },
  temporarily_unavailable: { available: false, label: 'Temporarily unavailable' },
} satisfies Record<Availability[keyof Availability], { available: boolean; label: string }>

export function describeWordAvailability(availability: Availability | undefined) {
  if (!availability) return 'Source availability not reported.'
  return wordAvailabilitySources.map(({ key, label }) => {
    const status = availability[key]
    const description = key === 'corpus' && status === 'missing' ? 'No analysis' : statuses[status].label
    return `${label}: ${description}.`
  }).join(' ')
}

export function availableWordSources(availability: Availability | undefined) {
  return wordAvailabilitySources.map(({ key }) => availability ? statuses[availability[key]].available : false)
}

export function WordAvailabilityCircles({ availability }: { readonly availability: Availability | undefined }) {
  const circles = availableWordSources(availability).map(available => available ? '●' : '○').join('')
  return <span aria-hidden="true" dir="ltr" className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-ui-body text-[10px] leading-none font-semibold tracking-[.12em] text-ui-muted">{circles}</span>
}

export function WordAvailabilityLegend() {
  return <div className="mb-3 px-4 text-sm leading-relaxed text-ui-muted">
    <p className="m-0">Left to right: {wordAvailabilitySources.map(({ label }) => label).join(', ')}.</p>
    <div className="flex flex-wrap gap-x-4">
      <span><span aria-hidden="true">● </span><span>Available or indexed</span></span>
      <span><span aria-hidden="true">○ </span><span>Missing, unknown, unreported or temporarily unavailable</span></span>
    </div>
  </div>
}
