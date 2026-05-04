import type { Metadata } from 'next'
import { Epilogue, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700'],
  variable: '--font-epilogue',
  display: 'block',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-mono',
  display: 'block',
})

export const metadata: Metadata = {
  title: 'geōrgia. — área do cliente',
  description: 'Portal de acompanhamento de projetos geōrgia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${epilogue.variable} ${ibmPlexMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon-light.svg" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)" />
      </head>
      <body>{children}</body>
    </html>
  )
}
