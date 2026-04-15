import { NextResponse } from 'next/server'
import { firebase } from '../../../config/firebase'
import { fetchConversation } from '@/app/lib/fetchcommunication'

type HandlerResult = {
  success: boolean
  error?: unknown
}

type BaseMessage = {
  id: string | number
  conversation_id: string | number
  created_at: string | number | Date
}

type WebhookData_OutboundMsg = {
  message: BaseMessage & {
    user_id: string | number
  }
  contact: {
    id: string | number
  }
}

type WebhookData_InboundMsg = {
  message: BaseMessage & {
    contact_id: string | number
  }
  contact: {
    owner_id: string | number
  }
}

type WebhookData_CallOut = {
  message: BaseMessage & {
    user_id: string | number
    contact_id: string | number
  }
}

/* =========================
   POST HANDLER
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event, data } = body

    if (!event) {
      return NextResponse.json({ message: 'Missing event' }, { status: 400 })
    }

    let result: HandlerResult | undefined

    switch (event) {
      case 'message.sent':
        result = await handleOutboundmsg(data)
        break

      case 'message.received':
        // result = await handleInboundmsg(data)
        break

      case 'call.recording_available':
        result = await handleCallOut(data)
        break

      default:
        return NextResponse.json({ message: 'Unknown event' }, { status: 400 })
    }

    if (!result?.success) {
      return NextResponse.json(
        { message: 'DB write failed', error: result?.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'success' })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ message: 'failed' }, { status: 500 })
  }
}

/* =========================
   HANDLERS
========================= */

async function handleOutboundmsg(
  data: WebhookData_OutboundMsg
): Promise<HandlerResult> {
  try {
    const id = String(data?.message?.id || '').trim()
    if (!id) throw new Error('Missing message id')

    const convo = await fetchConversation(data.message.conversation_id)
    if (!convo) throw new Error('Conversation not found')

    const msgOut = {
      id,
      communication_type: 'Message OutBound',
      sender_id: data.message.user_id ?? null,
      receiver_id: data.contact.id ?? null,
      conversation_id: data.message.conversation_id ?? null,
      team_id: convo.inbox_id ?? 0,
      createdAt: new Date(data.message.created_at),
    }

    await firebase
      .collection('SalesMessageLogs')
      .doc(id)
      .set(msgOut, { merge: true })

    return { success: true }
  } catch (error) {
    console.error('Outbound error:', error)
    return { success: false, error }
  }
}

async function handleInboundmsg(
  data: WebhookData_InboundMsg
): Promise<HandlerResult> {
  try {
    const id = String(data?.message?.id || '').trim()
    if (!id) throw new Error('Missing message id')

    const convo = await fetchConversation(data.message.conversation_id)
    if (!convo) throw new Error('Conversation not found')
      console.log(data)
    const msgIn = {
      id,
      communication_type: 'Message InBound',
      sender_id: data.message.contact_id ?? null,
      receiver_id: data.contact.owner_id ?? null,
      conversation_id: data.message.conversation_id ?? null,
      team_id: convo.inbox_id ?? 0,
      createdAt: new Date(data.message.created_at),
    }

    await firebase
      .collection('SalesMessageLogs')
      .doc(id)
      .set(msgIn, { merge: true })

    return { success: true }
  } catch (error) {
    console.error('Inbound error:', error)
    return { success: false, error }
  }
}

async function handleCallOut(
  data: WebhookData_CallOut
): Promise<HandlerResult> {
  try {
    const id = String(data?.message?.id || '').trim()
    if (!id) throw new Error('Missing message id')

    const convo = await fetchConversation(data.message.conversation_id)
    if (!convo) throw new Error('Conversation not found')

    const callOut = {
      id,
      communication_type: 'Call OutBound',
      caller_id: data.message.user_id ?? null,
      receiver_id: data.message.contact_id ?? null,
      conversation_id: data.message.conversation_id ?? null,
      team_id: convo.inbox_id ?? 0,
      createdAt: new Date(data.message.created_at),
    }

    await firebase
      .collection('SalesMessageLogs')
      .doc(id)
      .set(callOut, { merge: true })

    return { success: true }
  } catch (error) {
    console.error('CallOut error:', error)
    return { success: false, error }
  }
}

/* =========================
   GET HANDLER
========================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const team = searchParams.get('team')

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing start or end' },
        { status: 400 }
      )
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    const teamId =
      team !== null && !isNaN(Number(team)) ? Number(team) : null

    console.log("start",startDate,"end",endDate,"team",teamId)
    let query: FirebaseFirestore.Query = firebase
      .collection('SalesMessageLogs')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)

    if (teamId !== null && teamId !== 0) {
      query = query.where('team_id', '==', teamId)
    }

    query = query.orderBy('createdAt', 'desc')

    const snapshot = await query.get()

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('GET error:', error)

    const message =
      error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}