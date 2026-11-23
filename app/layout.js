import "./globals.css";

export const metadata = { title: "Cmd Drop" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
