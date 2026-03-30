import type { Metadata } from 'next';
import GoogleScript from '@/components/GoogleScript';
import './globals.css';

export const metadata: Metadata = {
  title: 'FutureSight — Product Lead Dashboard',
  description: 'FutureSight Ventures product dashboard — tasks, playbooks, and venture health.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Google Identity Services — loaded via client component for onLoad support */}
        <GoogleScript />
      </body>
    </html>
  );
}
