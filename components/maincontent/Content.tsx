'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Container,
  Grid,
  Skeleton,
  Card,
  Group,
  Text,
  Select
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import style from "./Content.module.css"
import { fetchTeams } from '@/app/lib/fetchteams'
import { fetchMembers } from '@/app/lib/fetchmembers'
import { LineChart } from '@mantine/charts'

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
  team_id?: number;
}

type ChartItem = {
  date: string
  msgInbound: number
  msgOutbound: number
  callInbound: number
  callOutbound: number
}

export function MainContent() {
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string | null>(null)
  const [orgdata, setOrgData] = useState<Message[]>([])
  const [membernames, setMembernames] = useState<Member[]>([])

  /**
   * Fetch messages
   */
  useEffect(() => {
    if (!startDate || !endDate) return

    const load = async () => {
      try {
        setLoading(true)

        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)

        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        const startISO = start.toISOString()
        const endISO = end.toISOString()

        const team = selectedDepartment

        const res = await fetch(
          `/api/webhook/message?start=${startISO}&end=${endISO}&team=${team}`
        )

        if (!res.ok) {
          throw new Error(await res.text())
        }

        const data = await res.json()
        setOrgData(data)
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [startDate, endDate, selectedDepartment])

  /**
   * Fetch Teams
   */
  useEffect(() => {
    fetchTeams().then((res) => setTeams(res || []))
  }, [])

  /**
   * Fetch Members
   */
  useEffect(() => {
    fetchMembers().then((res) => {
      const cleaned = (res || []).map((item: Member) => ({
        id: item.id,
        full_name: item.full_name,
      }))
      setMembernames(cleaned)
    })
  }, [])

  const departments = teams.map((item) => ({
    value: item.id.toString(),
    label: item.name,
  }))

  const membersselect = membernames.map((member) => ({
    value: member.id.toString(),
    label: member.full_name
  }))

  const heading =
    departments.find((dept) => dept.value === selectedDepartment)?.label ?? null

  /**
   * Grouped stats
   */
  const grouped = useMemo(() => {
    return orgdata.reduce<Record<string, Message[]>>((acc, item) => {
      const type = item.communication_type
      ;(acc[type] ||= []).push(item)
      return acc
    }, {})
  }, [orgdata])

  const statsConfig = [
    { label: "Total Inbound Message", key: "Message InBound" },
    { label: "Total Outbound Message", key: "Message OutBound" },
    { label: "Total Outbound Calls", key: "Call OutBound" },
    { label: "Total Inbound Calls", key: "Call InBound" },
  ]

  /**
   * Selected Member Stats
   */
  const selectedMemberStats = useMemo(() => {
    if (!selectedMembers) return null

    const memberId = Number(selectedMembers)

    const stats = {
      name: membernames.find((m) => m.id === memberId)?.full_name || "Unknown",
      inboundMsg: 0,
      outboundMsg: 0,
      inboundCall: 0,
      outboundCall: 0,
    }

    orgdata.forEach((msg) => {
      const type = msg.communication_type

      if (type === "Message InBound" && msg.receiver_id === memberId) {
        stats.inboundMsg++
      }

      if (type === "Message OutBound" && msg.sender_id === memberId) {
        stats.outboundMsg++
      }

      if (type === "Call InBound" && msg.receiver_id === memberId) {
        stats.inboundCall++
      }

      if (type === "Call OutBound" && msg.caller_id === memberId) {
        stats.outboundCall++
      }
    })

    return stats
  }, [selectedMembers, orgdata, membernames])

  /**
   * Chart
   */
  function generateDailySeries(start: string, end: string) {
  const dates: string[] = []

  const current = new Date(start)
  const last = new Date(end)

  current.setHours(0, 0, 0, 0)
  last.setHours(0, 0, 0, 0)

  while (current <= last) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}


  const chartData = useMemo(() => {
  if (!startDate || !endDate) return []

  const map: Record<string, ChartItem> = {}

  // Step 1: group existing data
  orgdata.forEach((msg) => {
    const date = new Date(msg.createdAt._seconds * 1000)
      .toISOString()
      .split('T')[0]

    if (!map[date]) {
      map[date] = {
        date,
        msgInbound: 0,
        msgOutbound: 0,
        callInbound: 0,
        callOutbound: 0,
      }
    }

    if (msg.communication_type === "Message InBound") map[date].msgInbound++
    if (msg.communication_type === "Message OutBound") map[date].msgOutbound++
    if (msg.communication_type === "Call InBound") map[date].callInbound++
    if (msg.communication_type === "Call OutBound") map[date].callOutbound++
  })

  // Step 2: generate full date range
  const allDates = generateDailySeries(startDate, endDate)

  // Step 3: fill missing dates
  return allDates.map((date) => {
    return (
      map[date] || {
        date,
        msgInbound: 0,
        msgOutbound: 0,
        callInbound: 0,
        callOutbound: 0,
      }
    )
  })
}, [orgdata, startDate, endDate])
  return (
    <Container px={100} fluid my="sm">
      <Grid>

        {/* Title */}
        <Grid.Col>
          <Text fw={900} py={10} className={style.headingmain} size="xl">
            ANALYTICS
          </Text>
        </Grid.Col>

        {/* Filters */}
        <Grid.Col span={12}>
          <Grid>

            {/* Date Pickers */}
            <Grid.Col span={4}>
              <Grid>
                <Grid.Col span={6}>
                  <DatePickerInput
                    label="Start date"
                    value={startDate}
                    onChange={setStartDate}
                  />
                </Grid.Col>

                <Grid.Col span={6}>
                  <DatePickerInput
                    label="End date"
                    value={endDate}
                    onChange={setEndDate}
                  />
                </Grid.Col>
              </Grid>
            </Grid.Col>

            {/* Department */}
            <Grid.Col span={4}>
              <Skeleton visible={loading}>
                <Text className={style.heading} size="xl" fw={700}>
                  {heading || (selectedDepartment ? "Loading..." : "Select Department")}
                </Text>
              </Skeleton>
            </Grid.Col>

            {/* Selects */}
            <Grid.Col span={4}>
              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="Select Department"
                    data={departments}
                    value={selectedDepartment}
                    onChange={setSelectedDepartment}
                  />
                </Grid.Col>

                <Grid.Col span={6}>
                  <Select
                    label="Select Member"
                    data={membersselect}
                    value={selectedMembers}
                    onChange={setSelectedMembers}
                  />
                </Grid.Col>
              </Grid>
            </Grid.Col>

          </Grid>
        </Grid.Col>

        {/* Stats */}
        {statsConfig.map((item) => {
          let count = 0

          if (selectedMembers && selectedMemberStats) {
            if (item.key === "Message InBound") count = selectedMemberStats.inboundMsg
            if (item.key === "Message OutBound") count = selectedMemberStats.outboundMsg
            if (item.key === "Call InBound") count = selectedMemberStats.inboundCall
            if (item.key === "Call OutBound") count = selectedMemberStats.outboundCall
          } else {
            count = grouped[item.key]?.length || 0
          }

          return (
            <Grid.Col key={item.key} span={{ base: 12, md: 6, lg: 3 }}>
              <Skeleton visible={loading}>
                <Card radius="md" p="lg" withBorder shadow="md">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{item.label}</Text>
                    <Text fw={900} size="xl">{count}</Text>
                  </Group>
                </Card>
              </Skeleton>
            </Grid.Col>
          )
        })}

        {/* Chart */}
        <Grid.Col span={12}>
          <Card withBorder shadow="md" p="lg">
            <LineChart
              withLegend
              h={500}
              data={chartData}
              dataKey="date"
              series={[
                { name: "msgInbound", label: "Message Inbound", color: "blue" },
                { name: "msgOutbound", label: "Message Outbound", color: "green" },
                { name: "callInbound", label: "Call Inbound", color: "orange" },
                { name: "callOutbound", label: "Call Outbound", color: "red" },
              ]}
              curveType="linear"
            />
          </Card>
        </Grid.Col>

      </Grid>
    </Container>
  )
}