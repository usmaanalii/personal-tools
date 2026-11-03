import type { ReactNode } from 'react'

type IconName = 'search' | 'bookmark' | 'back' | 'next' | 'play' | 'more' | 'list' | 'home' | 'settings'

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, bookmark: <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4z"/>,
    back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></>, next: <><path d="m9 18 6-6-6-6"/><path d="M15 12H3"/></>,
    play: <><path d="m8 5 12 7-12 7z"/></>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>, home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
    settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.1.9-1.2 2-1.4-.6a8 8 0 0 1-1.4.8l-.2 1.5h-2.4l-.3-1.5a8 8 0 0 1-1.5-.6l-1.3.8-1.7-1.7.8-1.3a8 8 0 0 1-.6-1.5l-1.5-.3v-2.4l1.5-.3a8 8 0 0 1 .6-1.5l-.8-1.3 1.7-1.7 1.3.8a8 8 0 0 1 1.5-.6l.3-1.5h2.4l.2 1.5a8 8 0 0 1 1.4.8l1.4-.6 1.2 2-1.1.9a8 8 0 0 1 0 2Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
