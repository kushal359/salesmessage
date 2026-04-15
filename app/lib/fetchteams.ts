type Team = {
    id: number | string;
    name: string;
}


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
        const data = await res.json();
        const ids = [
            "73585", // HVAC - HOUSTON
            "19834", // HVAC - DFW
            "208423", //HVAC - Tampa
            "114723", // HVAC - San Antonio
            "208422", // HVAC - Orlando
            "82473"  // HVAC - Austin
            ];
        const filteredData = data.filter((team:Team) => ids.includes(team.id.toString()));
        return filteredData;
    } catch (error) {
        console.error('Failed to fetch messages',error)
        return []
    }    
}