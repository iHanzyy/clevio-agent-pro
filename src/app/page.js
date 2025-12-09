import MobileLanding from "@/components/marketing/MobileLanding";
import { MessageCircle } from "lucide-react";

const title = "Clevio - AI Staff Automation untuk WhatsApp Bisnis Indonesia";
const description =
  "Automasi customer service & sales dengan AI staff 24/7. Hemat 80% biaya staf, tingkatkan respon 3x lebih cepat. Integrasi WhatsApp, setup 5 menit.";

export const metadata = {
  title,
  description,
  keywords: ["AI Staff", "WhatsApp Automation", "Customer Service", "Sales Automation", "Chatbot Indonesia"],
  authors: [{ name: "Clevio Team" }],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "id_ID",
    url: "https://clevio.id",
    siteName: "Clevio AI",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Clevio AI Staff Automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Mobile Content */}
      <div className="md:hidden">
        <MobileLanding />
      </div>

      {/* Desktop Blocker */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 px-6 text-center">
        <div className="max-w-lg space-y-6 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Mobile-First Experience
          </h1>
          <p className="text-lg text-blue-100 mb-6">
            Clevio AI dirancang khusus untuk pengalaman mobile terbaik.
          </p>
          <div className="space-y-3 text-white/80 text-sm">
            <p>🚀 Optimized for mobile devices</p>
            <p>📱 Best experience on smartphones</p>
            <p>💻 Desktop version coming soon</p>
          </div>
          <div className="pt-4 border-t border-white/20">
            <p className="text-sm text-blue-200">
              Silakan buka website menggunakan perangkat mobile untuk pengalaman penuh.
            </p>
          </div>
        </div>
      </div>
    </main>
  );                    
}
