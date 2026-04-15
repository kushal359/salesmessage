import { firebase } from '../config/firebase'
import { fetchConversation } from '@/app/lib/fetchcommunication'

async function backfillTeamId() {
  console.log('Starting migration...')

  const snapshot = await firebase.collection('SalesMessageLogs').get()

  let batch = firebase.batch()
  let count = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()

    if (data.team_id !== undefined) continue

    try {
      let teamId = 0

      if (data.conversation_id) {
        const convo = await fetchConversation(data.conversation_id)
        if (convo?.inbox_id) {
          teamId = convo.inbox_id
        }
      }

      batch.update(doc.ref, { team_id: teamId })
      count++

      if (count % 500 === 0) {
        await batch.commit()
        console.log(`Updated ${count}`)
        batch = firebase.batch()
      }

    } catch (err) {
      console.error(`Failed doc ${doc.id}`, err)
    }
  }

  if (count % 500 !== 0) {
    await batch.commit()
  }

  console.log('Migration complete')
}

backfillTeamId()