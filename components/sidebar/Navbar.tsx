import { useState } from 'react'
import {
  IconCalendarStats,
  IconDeviceDesktopAnalytics,
  IconHome2,
  IconSettings,
  IconUser,
} from '@tabler/icons-react'
import { Center, Stack, Tooltip, UnstyledButton } from '@mantine/core'
import { MantineLogo } from '@mantinex/mantine-logo'
import classes from './Navbar.module.css'

interface NavbarLinkProps {
  icon: typeof IconHome2
  label: string
  active?: boolean
  onClick?: () => void
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={onClick}
        className={classes.link}
        data-active={active || undefined}
        aria-label={label}
      >
        <Icon size={20} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  )
}

const mockdata = [
  { icon: IconHome2, label: 'Home' },
  { icon: IconDeviceDesktopAnalytics, label: 'Analytics' },
  { icon: IconCalendarStats, label: 'Releases' },
  { icon: IconUser, label: 'Account' },
  { icon: IconSettings, label: 'Settings' },
]

export function NavbarMinimal() {
  const [active, setActive] = useState(2)
  const [connected] = useState(false);

  const links = mockdata.map((link, index) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={index === active}
      onClick={() => setActive(index)}
    />
  ))
    const connect = () => {
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

    if (!redirectUri) {
      throw new Error('Missing NEXT_PUBLIC_REDIRECT_URI');
    }

    const url = `https://api.salesmessage.com/pub/v2.2/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = url;
  };

  return (
    <nav className={classes.navbar}>
      <Center>
        <MantineLogo type="mark" size={30} />
      </Center>

      <div className={classes.navbarMain}>
        <Stack justify="center" gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify="center" gap={0}>
      {!connected && (
        <NavbarLink
          icon={IconUser}
          label="Connect Salesmsg"
          // onClick={connect}
        />
      )}
      </Stack>
    </nav>
  )
}
