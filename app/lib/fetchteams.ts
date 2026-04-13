export async function fetchTeams() {
    try {
        const res = await fetch(`https://api.salesmessage.com/pub/v2.2/teams/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SALES_MESSAGE_API_KEY}`
            },
            next: { revalidate: 0 },
        })
        if(!res.ok){
            throw new Error(`HTTP Error! status: ${res.status}`)
        }
        return await res.json();
    } catch (error) {
        console.error('Failed to fetch messages',error)
        return []
    }    
}