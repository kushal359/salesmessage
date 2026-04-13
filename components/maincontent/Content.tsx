import { useEffect, useState, useMemo } from 'react'
import { Container, Grid, Skeleton, Card, Group, Text, Stack, Select,Table, ScrollArea } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import style from "./Content.module.css"
import { fetchTeams } from '@/app/lib/fetchteams'
import { fetchConversation } from '@/app/lib/fetchcommunication'
import { fetchMembers } from '@/app/lib/fetchmembers'

type Team = {
  id: number;
  name: string;
};

type Member = {
  id: number;
  full_name: string;
};

interface Message {
  communication_type: string;
  conversation_id: number;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  id: string;
  receiver_id: number;
  sender_id: number;
  caller_id?: number;
}

type Conversation = {
  inbox_id: number;
};

export function MainContent() {
  const [value, setValue] = useState<[string | null, string | null]>([null, null])
  const [loading, setloading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [orgdata, setOrgData] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({})
  const [membernames, setMembernames] = useState<Member[]>([])
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
};

  /**
   * Fetch messages
   */
  useEffect(() => {
    if (!value || !value[0] || !value[1]) return;

    const load = async () => {
      try {
        const start = `${value[0]}T00:00:00.000Z`
        const end = `${value[1]}T23:59:59.999Z`

        const res = await fetch(`/api/webhook/message?start=${start}&end=${end}`)
        if (!res.ok) {
          const errorText = await res.text();
          console.error("API ERROR:", errorText);
          throw new Error(errorText || "Failed request");
        }

        const data = await res.json()
        setOrgData(data)
      } catch (err) {
        console.error(err)
      }
    }

    load()
  }, [value])

  /**
   * Conversation IDs
   */
  const conversation_ids = useMemo(() => {
    return [...new Set(orgdata.map((item)=>item.conversation_id))]
  }, [orgdata])

  /**
   * Fetch Conversations (ignore failures)
   */
  useEffect(() => {
  if (!conversation_ids.length) return;

  const loadConversations = async () => {
    const batches = chunkArray(conversation_ids, 5); // 👈 5 at a time

    const mapped: Record<string, Conversation> = {};

    for (const batch of batches) {
      try {
        const results = await Promise.allSettled(
          batch.map((id) => fetchConversation(id))
        );

        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            const id = batch[index];
            mapped[id] = result.value;
          }
        });

        // 👇 small delay to protect API quota
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error("Batch failed:", err);
      }
    }

    setConversations(mapped);
  };

  loadConversations();
}, [conversation_ids]);

  /**
   * Fetch Teams
   */
  useEffect(() => {
    fetchTeams().then((res) => setTeams(res || []))
  }, [])

  const departments = teams.map((item) => ({
    value: item.id.toString(),
    label: item.name,
  }));

  const heading =
    departments.find((dept) => dept.value === selectedDepartment)?.label ?? null;

  /**
   * Filter by department (inbox_id)
   */
  const filteredData = useMemo(() => {
    if (!selectedDepartment) return orgdata;

    return orgdata.filter((msg) => {
      const convo = conversations[msg.conversation_id];
      return convo?.inbox_id === Number(selectedDepartment);
    });
  }, [orgdata, conversations, selectedDepartment]);

  /**
   * Fetch Members (only id + full_name)
   */
  useEffect(()=>{
    fetchMembers().then((res)=> {
      const cleaned = (res || []).map((item: Member) => ({
        id: item.id,
        full_name: item.full_name,
      }));
      setMembernames(cleaned);
    })
  },[])

  /**
   * Global grouped stats (top 4 cards)
   */
  const grouped = useMemo(() => {
    return filteredData.reduce<Record<string, Message[]>>((acc, item) => {
      const type = item.communication_type;
      (acc[type] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredData]);

  const statsConfig = [
    { label: "Total Inbound Message", key: "Message InBound" },
    { label: "Total Outbound Message", key: "Message OutBound" },
    { label: "Total Outbound Calls", key: "Call OutBound" },
    { label: "Total Inbound Calls", key: "Call InBound" },
  ];

  /**
   *  Member-wise stats
   */
  const memberStats = useMemo(() => {
    const stats: Record<number, {
      name: string;
      inboundMsg: number;
      outboundMsg: number;
      inboundCall: number;
      outboundCall: number;
    }> = {};

    const memberMap: Record<number, string> = {};
    membernames.forEach((m) => {
      memberMap[m.id] = m.full_name;
    });

    filteredData.forEach((msg) => {
      const type = msg.communication_type;

      let memberId: number | null = null;

      if (type === "Message InBound") {
        memberId = msg.receiver_id;
      } else if (type === "Message OutBound") {
        memberId = msg.sender_id;
      } else if (type === "Call OutBound") {
        memberId = msg.caller_id ?? null;
      } else if (type === "Call InBound") {
        memberId = msg.receiver_id;
      }

      if (!memberId) return;

      if (!stats[memberId]) {
        stats[memberId] = {
          name: memberMap[memberId] || "Unknown",
          inboundMsg: 0,
          outboundMsg: 0,
          inboundCall: 0,
          outboundCall: 0,
        };
      }

      if (type === "Message InBound") stats[memberId].inboundMsg++;
      if (type === "Message OutBound") stats[memberId].outboundMsg++;
      if (type === "Call InBound") stats[memberId].inboundCall++;
      if (type === "Call OutBound") stats[memberId].outboundCall++;
    });

    return Object.entries(stats).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [filteredData, membernames]);

  /**
   * Loading delay
   */
  useEffect(() => {
    setTimeout(() => setloading(false), 2000)
  }, [])

  return (
    <Container px={100} fluid my="sm">
      <Grid>
        <Grid.Col>
          <Text fw={900} py={10} className={style.headingmain} size='xl'>
            ANALYTICS
          </Text>
        </Grid.Col>

        {/* Filters */}
        <Grid.Col span={12}>
          <Grid>
            <Grid.Col span={4}>
              <Skeleton visible={loading}>
                <DatePickerInput
                  type="range"
                  label="Pick dates range"
                  value={value}
                  onChange={setValue}
                />
              </Skeleton>
            </Grid.Col>

            <Grid.Col span={4}>
              <Skeleton visible={loading}>
                <Text className={style.heading} size="xl" fw={700}>
                  {heading || (selectedDepartment ? "Loading..." : "Select Department")}
                </Text>
              </Skeleton>
            </Grid.Col>

            <Grid.Col span={4}>
              <Skeleton visible={loading}>
                <Select
                  label="Select Department"
                  data={departments}
                  value={selectedDepartment}
                  onChange={setSelectedDepartment}
                />
              </Skeleton>
            </Grid.Col>
          </Grid>
        </Grid.Col>

        {/* Top Stats */}
        {statsConfig.map((item) => {
          const count = grouped[item.key]?.length || 0;

          return (
            <Grid.Col key={item.key} span={{ base: 12, md: 6, lg: 3 }}>
              <Skeleton visible={loading}>
                <Card shadow="sm" padding="lg" withBorder>
                  <Group justify="center">
                    <Stack>
                      <Text fw={700}>{item.label}</Text>
                      <Text>{count}</Text>
                    </Stack>
                  </Group>
                </Card>
              </Skeleton>
            </Grid.Col>
          );
        })}

       <Grid.Col span={12}>
  <Card withBorder>
    <Text fw={700} mb="sm">Agent Performance</Text>

    <ScrollArea>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>In Msg</Table.Th>
            <Table.Th>Out Msg</Table.Th>
            <Table.Th>In Call</Table.Th>
            <Table.Th>Out Call</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {memberStats.map((member) => (
            <Table.Tr key={member.id}>
              <Table.Td>{member.name}</Table.Td>
              <Table.Td>{member.inboundMsg}</Table.Td>
              <Table.Td>{member.outboundMsg}</Table.Td>
              <Table.Td>{member.inboundCall}</Table.Td>
              <Table.Td>{member.outboundCall}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  </Card>
</Grid.Col>

      </Grid>
    </Container>
  )
}