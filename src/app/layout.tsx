import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cement & RMX Supply Chain AI Agents',
  description: '32 Specialized AI Agents for End-to-End Cement & Ready-Mix Concrete Supply Chain Automation',
  keywords: ['cement', 'ready-mix concrete', 'supply chain', 'AI agents', 'automation'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#050d1a] text-gray-100 font-['Inter'] antialiased">
        {children}
      </body>
    </html>
  );
}
