const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN!
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER!

export async function sendSms(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: FROM_NUMBER, To: to, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.json() as { message?: string }
    throw new Error(`Twilio: ${err.message ?? res.status}`)
  }
}
