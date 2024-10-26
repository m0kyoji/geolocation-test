import { NextResponse } from 'next/server'
import webpush from 'web-push'

const vapidKeys = webpush.generateVAPIDKeys()

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

export async function POST(request: Request) {
  const subscription = await request.json()
  const payload = JSON.stringify({ title: '通知', body: '目的地に近づきました' })

  try {
    await webpush.sendNotification(subscription, payload)
    return NextResponse.json({ success: true })
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}