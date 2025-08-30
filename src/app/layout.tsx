import './globals.css'

export const metadata = {
  title: 'Appable - Accessibility Scanner',
  description: 'Accessibility Scanner Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}