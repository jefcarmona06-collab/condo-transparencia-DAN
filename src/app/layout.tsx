import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-nunito',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Residencias DAN Torre A | App Móvil de Condominio',
  description:
    'Aplicación Móvil de Transparencia Financiera, Facturas PDF y Cuentas por Cobrar — Residencias DAN Torre A (RIF J-29495522-3), Parroquia San Juan, Caracas.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DAN Torre A',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={nunito.variable}>
      <body
        className={`${nunito.className} min-h-screen bg-slate-200/80 text-slate-900 selection:bg-[#1d4ed8] selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
