import { NextRequest } from 'next/server'
import { getRecentAlerts } from '@/lib/alertEngine'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  return Response.json(getRecentAlerts())
}
