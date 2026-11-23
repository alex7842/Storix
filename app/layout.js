import "./globals.css";

export const metadata = { title: "Storix" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
