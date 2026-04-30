import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'geōrgia. — área do cliente',
  description: 'Portal de acompanhamento de projetos geōrgia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@200;300;400;600;700&family=IBM+Plex+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
