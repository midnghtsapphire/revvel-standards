export const metadata = {
  title: 'My Orders → Lifestyle Pics',
  description: 'Upload Amazon order CSV. One product at a time. Get 3 real-life style images.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b0b12', color: '#f4f4ff' }}>
        {children}
      </body>
    </html>
  );
}
