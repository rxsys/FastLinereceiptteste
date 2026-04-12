import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal do desenvolvedor',
  description: 'Global configuration and administration',
};

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
