import ClevioLandingPage from "@/components/marketing/ClevioLandingPage";

const title =
  "Clevio AI Staff - AI yang Kerja 24/7, Harga di Bawah UMR | WhatsApp Automation";
const description =
  "Hemat biaya hingga 80% dengan AI Staff yang handle chat pelanggan 24/7. Tidak perlu bayar gaji bulanan. Setup 5 menit tanpa keahlian teknis. Coba gratis sekarang!";
const keywords = [
  "ai staff indonesia",
  "otomatis whatsapp bisnis",
  "hemat biaya karyawan",
  "chat pelanggan otomatis",
  "ai penjualan umkm",
  "whatsapp automation indonesia",
  "staff ai harga murah",
];

export const metadata = {
  title,
  description,
  keywords,
  openGraph: {
    title,
    description,
  },
  twitter: {
    title,
    description,
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ClevioLandingPage />
    </main>
  );
}
