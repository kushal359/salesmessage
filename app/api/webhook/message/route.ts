import { NextResponse } from 'next/server'
import { firebase } from '../../../config/firebase'

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
        result = await handleInboundmsg(data)
        break

      case 'call.recording_available':
        if (!data?.message?.user_id) {
          //result = await handleCallIn(data)
        } else {
          result = await handleCallOut(data)
        }
        break

      default:
        return NextResponse.json({ message: 'Unknown event' }, { status: 400 })
    }

    if (!result?.success) {
      return NextResponse.json(
        { message: 'DB write failed', error: result?.error },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: 'success' })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ message: 'failed' }, { status: 500 })
  }
}

/**
 * Outbound Messages
 */
async function handleOutboundmsg(data: WebhookData_OutboundMsg): Promise<HandlerResult> {
  try {
    const id = String(data?.message?.id || '').trim()
    if (!id) throw new Error('Missing data.id')

    const msgOut = {
      id,
      communication_type: 'Message OutBound',
      sender_id: data.message.user_id,
      receiver_id: data.contact.id,
      conversation_id: data.message.conversation_id,
      createdAt: new Date(data.message.created_at),
    }

    await firebase.collection('SalesMessageLogs').doc(id).set(msgOut, { merge: true })

    console.log('Outbound message stored')
    return { success: true }
  } catch (error) {
    console.error('Outbound error:', error)
    return { success: false, error }
  }
}

/**
 * Inbound Messages
 */
async function handleInboundmsg(data: WebhookData_InboundMsg): Promise<HandlerResult> {
  try {
    const id = String(data?.message?.id || '').trim()
    if (!id) throw new Error('Missing data.id')

    const msgIn = {
      id,
      communication_type: 'Message InBound',
      sender_id: data.message.contact_id,
      receiver_id: data.contact.owner_id,
      conversation_id: data.message.conversation_id,
      createdAt: new Date(data.message.created_at),
    }

    await firebase.collection('SalesMessageLogs').doc(id).set(msgIn, { merge: true })

    console.log('Inbound message stored')
    return { success: true }
  } catch (error) {
    console.error('Inbound error:', error)
    return { success: false, error }
  }
}

/**
 * Call Outbound
 */
async function handleCallOut(data: WebhookData_CallOut): Promise<HandlerResult> {
  try {
    const id = String(data?.message?.id || '').trim()
    if (!id) throw new Error('Missing data.message.id')

    const callOutRecord = {
      id,
      communication_type: 'Call OutBound',
      caller_id: data.message.user_id,
      receiver_id: data.message.contact_id,
      conversation_id: data.message.conversation_id,
      createdAt: new Date(data.message.created_at),
    }

    await firebase.collection('SalesMessageLogs').doc(id).set(callOutRecord, { merge: true })

    console.log('Outbound call stored')
    return { success: true }
  } catch (error) {
    console.error('CallOut error:', error)
    return { success: false, error }
  }
}

/**
 * Call Inbound
 */
// async function handleCallIn(data: any ): Promise<HandlerResult> {
//   try {
//     const id = String(data?.message?.id || '').trim()
//     if (!id) throw new Error('Missing data.message.id')

//     const convo = await fetcheachConvo(data.message.conversation_id)

//     if (!convo) throw new Error('Conversation not found')

//     const ids = convo.messages.filter((m: any) => m.id === data.message.id).map((m: any) => m.id)

//     const callInRecord = {
//       id,
//       communication_type: 'Call InBound',
//       caller_id: data.message.contact_id,
//       receiver_id: ids,
//       conversation_id: data.message.conversation_id,
//       createdAt: new Date(data.message.created_at),
//     }

//     await firebase.collection('SalesMessageLogs').doc(id).set(callInRecord, { merge: true })

//     console.log('Inbound call stored')
//     return { success: true }
//   } catch (error) {
//     console.error('CallIn error:', error)
//     return { success: false, error }
//   }
// }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return new Response("Missing start or end", { status: 400 });
    }

      const startDate = new Date(start)
      const endDate = new Date(end)

      const snapshot = await firebase
        .collection('SalesMessageLogs')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .orderBy('createdAt', 'desc')
        .get()

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

    return Response.json(data);

  } catch (error: unknown) {
      console.error("API CRASH:", error);

      const message =
        error instanceof Error ? error.message : "Unknown error";

      return new Response(
        JSON.stringify({ error: message }),
        { status: 500 }
      );
    }
}