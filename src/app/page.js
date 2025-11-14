import ClevioLandingPage from "@/components/marketing/ClevioLandingPage";

export const metadata = {
  title: "Clevio AI Staff",
  description:
    "Launch AI agents for Indonesian SMEs, connect WhatsApp via QR, and scale operations without code using Clevio AI.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ClevioLandingPage />
    </main>
  );
}
