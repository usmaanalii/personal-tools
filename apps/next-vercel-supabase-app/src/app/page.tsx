import { cookies } from 'next/headers'
import { AccountControls } from '../components/account-controls'
import { ConnectionLab } from '../components/connection-lab'
import { isAuthConfigured } from './auth/provider'
import { readSession } from './auth/session'

export default async function Home({ searchParams }: PageProps<'/'>) {
  const [session, { auth }] = await Promise.all([
    cookies().then(readSession),
    searchParams,
  ])
  const callback =
    auth === 'denied' || auth === 'failed' || auth === 'link-expired'
      ? auth
      : undefined
  return (
    <ConnectionLab
      account={
        isAuthConfigured() && (
          <AccountControls session={session} callback={callback} />
        )
      }
    />
  )
}
