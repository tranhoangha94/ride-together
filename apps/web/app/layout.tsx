import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { NavBar } from "../components/NavBar";

export const metadata = {
  title: "Phượt Together",
  description: "Theo dõi vị trí và cảnh báo an toàn cho đoàn phượt"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
