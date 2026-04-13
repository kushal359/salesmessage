'use client'

import { NavbarMinimal } from '@/components/sidebar/Navbar'
import { AppShell } from '@mantine/core'
import { MainContent } from '@/components/maincontent/Content'

export default function Home() {
  return (
    <AppShell navbar={{ width: 80, breakpoint: 'sm' }}>
      <AppShell.Navbar>
        <NavbarMinimal />
      </AppShell.Navbar>

      <AppShell.Main>
        <MainContent />
      </AppShell.Main>
    </AppShell>
  );
}
