import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthContext';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'CodeTrack — Real-Time Student Coding Activity Monitor',
  description: 'Verified educational analytics for LeetCode and CodeChef student activity.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
