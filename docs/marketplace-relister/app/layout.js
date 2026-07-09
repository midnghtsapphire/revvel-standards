export const metadata = {
  title: 'Family Order Packs',
  description: 'Private family tool: Amazon orders → lifestyle listing pictures',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, Segoe UI, sans-serif',
          background: '#0b0b12',
          color: '#f4f4ff',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
