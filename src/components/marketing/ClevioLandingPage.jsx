"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Facebook,
  Instagram,
  LayoutTemplate,
  Linkedin,
  Menu,
  MessageSquare,
  QrCode,
  Shield,
  Sparkles,
  Twitter,
  X,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

const Button = forwardRef(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline:
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
    };
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
    };
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

const Switch = forwardRef(
  ({ checked = false, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

const Card = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const fadeUpVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.8 } },
};

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const translations = {
  hero_title: {
    en: "AI Agents Automate Your Sales & Operations",
    id: "Agen AI Otomatiskan Penjualan & Operasi Anda",
  },
  hero_subtitle: {
    en: "Connect WhatsApp in seconds. Build smart agents without code. Scale your Indonesian SME effortlessly.",
    id: "Hubungkan WhatsApp dalam hitungan detik. Bangun agen pintar tanpa kode. Kembangkan UMKM Indonesia Anda dengan mudah.",
  },
  cta_trial: {
    en: "Start Free Trial",
    id: "Mulai Uji Coba Gratis",
  },
  cta_demo: {
    en: "See Live Demo",
    id: "Lihat Demo Langsung",
  },
  cta_sales: {
    en: "Contact Sales",
    id: "Hubungi Sales",
  },
  cta_pricing: {
    en: "Pricing",
    id: "Harga",
  },
  benefit_1: {
    en: "Deploy AI agents in minutes, not months",
    id: "Terapkan agen AI dalam hitungan menit, bukan bulan",
  },
  benefit_2: {
    en: "WhatsApp automation with simple QR scan",
    id: "Otomasi WhatsApp dengan pemindaian QR sederhana",
  },
  benefit_3: {
    en: "No technical skills required to start",
    id: "Tidak perlu keterampilan teknis untuk memulai",
  },
  features_title: {
    en: "Everything You Need to Automate",
    id: "Semua yang Anda Butuhkan untuk Otomasi",
  },
  feature_1_title: {
    en: "Smart Agent Builder",
    id: "Pembuat Agen Pintar",
  },
  feature_1_desc: {
    en: "Design custom AI agents with our intuitive drag-and-drop interface. No coding required—just define your workflow and let the agent handle customer interactions.",
    id: "Rancang agen AI khusus dengan antarmuka drag-and-drop intuitif kami. Tidak perlu coding—cukup tentukan alur kerja Anda dan biarkan agen menangani interaksi pelanggan.",
  },
  feature_2_title: {
    en: "WhatsApp QR Connect",
    id: "Koneksi QR WhatsApp",
  },
  feature_2_desc: {
    en: "Scan a QR code and your agent is live on WhatsApp in seconds. Reach your customers where they already are, with zero technical setup.",
    id: "Pindai kode QR dan agen Anda langsung aktif di WhatsApp dalam hitungan detik. Jangkau pelanggan Anda di tempat mereka berada, tanpa pengaturan teknis.",
  },
  feature_3_title: {
    en: "Template Agent",
    id: "Agen Template",
  },
  feature_3_desc: {
    en: "Choose from pre-built agent templates for sales, support, and operations. Customize them to fit your business and launch instantly.",
    id: "Pilih dari template agen yang sudah jadi untuk penjualan, dukungan, dan operasi. Sesuaikan dengan bisnis Anda dan luncurkan secara instan.",
  },
  how_it_works_title: {
    en: "How It Works",
    id: "Cara Kerjanya",
  },
  step_1_title: {
    en: "Create Your Agent",
    id: "Buat Agen Anda",
  },
  step_1_desc: {
    en: "Use our builder or pick a template to design your AI agent in minutes.",
    id: "Gunakan pembuat kami atau pilih template untuk merancang agen AI Anda dalam hitungan menit.",
  },
  step_2_title: {
    en: "Connect WhatsApp via QR",
    id: "Hubungkan WhatsApp via QR",
  },
  step_2_desc: {
    en: "Scan the QR code to link your WhatsApp account—no API keys needed.",
    id: "Pindai kode QR untuk menghubungkan akun WhatsApp Anda—tidak perlu kunci API.",
  },
  step_3_title: {
    en: "Launch and Iterate",
    id: "Luncurkan dan Iterasi",
  },
  step_3_desc: {
    en: "Go live instantly. Monitor performance and refine your agent as you grow.",
    id: "Langsung aktif. Pantau kinerja dan sempurnakan agen Anda seiring pertumbuhan.",
  },
  integrations_title: {
    en: "Seamless WhatsApp Integration",
    id: "Integrasi WhatsApp yang Mulus",
  },
  integrations_desc: {
    en: "Connect your business to WhatsApp in seconds. Our QR-based setup means you're up and running without complex configurations.",
    id: "Hubungkan bisnis Anda ke WhatsApp dalam hitungan detik. Pengaturan berbasis QR kami berarti Anda siap tanpa konfigurasi rumit.",
  },
  pricing_title: {
    en: "Simple, Transparent Pricing",
    id: "Harga yang Sederhana dan Transparan",
  },
  pricing_subtitle: {
    en: "Choose the plan that fits your business. All plans include WhatsApp integration and agent templates.",
    id: "Pilih paket yang sesuai dengan bisnis Anda. Semua paket termasuk integrasi WhatsApp dan template agen.",
  },
  pricing_monthly: {
    en: "Monthly",
    id: "Bulanan",
  },
  pricing_yearly: {
    en: "Yearly",
    id: "Tahunan",
  },
  pricing_plan_note: {
    en: "Perfect for small businesses getting started with AI automation",
    id: "Sempurna untuk bisnis kecil yang memulai otomasi AI",
  },
  testimonials_title: {
    en: "What Our Customers Say",
    id: "Apa Kata Pelanggan Kami",
  },
  testimonial_1: {
    en: "Clevio AI helped us automate customer inquiries on WhatsApp. Our response time dropped from hours to seconds!",
    id: "Clevio AI membantu kami mengotomatiskan pertanyaan pelanggan di WhatsApp. Waktu respons kami turun dari jam menjadi detik!",
  },
  testimonial_1_name: {
    en: "Budi Santoso",
    id: "Budi Santoso",
  },
  testimonial_1_role: {
    en: "Owner, Toko Elektronik Jakarta",
    id: "Pemilik, Toko Elektronik Jakarta",
  },
  testimonial_2: {
    en: "The QR setup was so easy. We had our agent running in under 5 minutes. No tech headaches!",
    id: "Pengaturan QR sangat mudah. Kami menjalankan agen dalam waktu kurang dari 5 menit. Tanpa masalah teknis!",
  },
  testimonial_2_name: {
    en: "Siti Nurhaliza",
    id: "Siti Nurhaliza",
  },
  testimonial_2_role: {
    en: "Manager, Warung Kopi Bandung",
    id: "Manajer, Warung Kopi Bandung",
  },
  testimonial_3: {
    en: "We scaled our operations without hiring more staff. Clevio AI agents handle routine tasks perfectly.",
    id: "Kami meningkatkan operasi tanpa menambah staf. Agen Clevio AI menangani tugas rutin dengan sempurna.",
  },
  testimonial_3_name: {
    en: "Ahmad Rizki",
    id: "Ahmad Rizki",
  },
  testimonial_3_role: {
    en: "CEO, Logistik Express Surabaya",
    id: "CEO, Logistik Express Surabaya",
  },
  faq_title: {
    en: "Frequently Asked Questions",
    id: "Pertanyaan yang Sering Diajukan",
  },
  faq_1_q: {
    en: "Is there a free trial?",
    id: "Apakah ada uji coba gratis?",
  },
  faq_1_a: {
    en: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.",
    id: "Ya! Kami menawarkan uji coba gratis 14 hari dengan akses penuh ke semua fitur. Tidak perlu kartu kredit untuk memulai.",
  },
  faq_2_q: {
    en: "How do I connect WhatsApp?",
    id: "Bagaimana cara menghubungkan WhatsApp?",
  },
  faq_2_a: {
    en: "Simply scan the QR code we provide in your dashboard. Your WhatsApp account will be linked instantly—no API setup needed.",
    id: "Cukup pindai kode QR yang kami sediakan di dasbor Anda. Akun WhatsApp Anda akan terhubung secara instan—tidak perlu pengaturan API.",
  },
  faq_3_q: {
    en: "Are there pre-built templates?",
    id: "Apakah ada template yang sudah jadi?",
  },
  faq_3_a: {
    en: "Yes, we provide templates for sales, customer support, and operations. You can customize them to match your business needs.",
    id: "Ya, kami menyediakan template untuk penjualan, dukungan pelanggan, dan operasi. Anda dapat menyesuaikannya dengan kebutuhan bisnis Anda.",
  },
  faq_4_q: {
    en: "What payment methods do you accept?",
    id: "Metode pembayaran apa yang Anda terima?",
  },
  faq_4_a: {
    en: "We accept credit cards, bank transfers, and Indonesian e-wallets. Billing is monthly or yearly based on your plan.",
    id: "Kami menerima kartu kredit, transfer bank, dan e-wallet Indonesia. Penagihan bulanan atau tahunan berdasarkan paket Anda.",
  },
  faq_5_q: {
    en: "Is my data secure?",
    id: "Apakah data saya aman?",
  },
  faq_5_a: {
    en: "Absolutely. We use enterprise-grade encryption and comply with international data protection standards to keep your information safe.",
    id: "Tentu saja. Kami menggunakan enkripsi tingkat perusahaan dan mematuhi standar perlindungan data internasional untuk menjaga informasi Anda tetap aman.",
  },
  faq_6_q: {
    en: "Can I cancel anytime?",
    id: "Bisakah saya membatalkan kapan saja?",
  },
  faq_6_a: {
    en: "Yes, you can cancel your subscription at any time. No long-term contracts or hidden fees.",
    id: "Ya, Anda dapat membatalkan langganan kapan saja. Tidak ada kontrak jangka panjang atau biaya tersembunyi.",
  },
  faq_7_q: {
    en: "Do I need technical skills?",
    id: "Apakah saya perlu keterampilan teknis?",
  },
  faq_7_a: {
    en: "Not at all. Our platform is designed for non-technical users. If you can use WhatsApp, you can use Clevio AI.",
    id: "Sama sekali tidak. Platform kami dirancang untuk pengguna non-teknis. Jika Anda bisa menggunakan WhatsApp, Anda bisa menggunakan Clevio AI.",
  },
  footer_company: {
    en: "Company",
    id: "Perusahaan",
  },
  footer_about: {
    en: "About Us",
    id: "Tentang Kami",
  },
  footer_contact: {
    en: "Contact Sales",
    id: "Hubungi Sales",
  },
  footer_resources: {
    en: "Resources",
    id: "Sumber Daya",
  },
  footer_login: {
    en: "Login",
    id: "Masuk",
  },
  footer_register: {
    en: "Register",
    id: "Daftar",
  },
  footer_pricing: {
    en: "Pricing",
    id: "Harga",
  },
  footer_copyright: {
    en: "© 2024 Clevio AI Employees. All rights reserved.",
    id: "© 2024 Clevio AI Employees. Semua hak dilindungi.",
  },
  footer_privacy: {
    en: "Privacy Policy",
    id: "Kebijakan Privasi",
  },
  footer_terms: {
    en: "Terms of Service",
    id: "Syarat Layanan",
  },
  nav_login: {
    en: "Login",
    id: "Masuk",
  },
  nav_register: {
    en: "Register",
    id: "Daftar",
  },
};

const LanguageToggle = ({ language, setLanguage }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = useMemo(
    () => [
      { code: "en", label: "English", flag: "🇺🇸" },
      { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
    ],
    []
  );

  const selected = languages.find((item) => item.code === language);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
          "bg-white/60 dark:bg-neutral-900/90 backdrop-blur-md shadow-sm",
          "border-gray-200 dark:border-neutral-700",
          "text-gray-800 dark:text-neutral-200",
          "hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all"
        )}
      >
        <span>{selected?.flag}</span>
        <span className="hidden sm:inline">{selected?.label}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50",
            "bg-white/90 dark:bg-neutral-900/95 backdrop-blur-xl",
            "shadow-lg border border-gray-200 dark:border-neutral-700"
          )}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors",
                selected?.code === lang.code
                  ? "font-semibold text-blue-600 dark:text-blue-400"
                  : "text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
              )}
            >
              <span>{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {selected?.code === lang.code && (
                <Check className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ClevioLandingPage() {
  const [language, setLanguage] = useState("en");
  const [isYearly, setIsYearly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const switchRef = useRef(null);

  const t = useCallback(
    (key) => translations[key]?.[language] ?? key,
    [language]
  );

  const handleToggle = (checked) => {
    setIsYearly(checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ["#1c2974", "#3b82f6", "#60a5fa", "#93c5fd"],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6" style={{ color: "#1c2974" }} />
              <span className="text-xl font-bold">Clevio AI</span>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <LanguageToggle language={language} setLanguage={setLanguage} />
              <Button variant="ghost" asChild>
                <a href="/login">{t("nav_login")}</a>
              </Button>
              <Button asChild style={{ backgroundColor: "#1c2974" }}>
                <a href="/register">{t("nav_register")}</a>
              </Button>
            </div>

            <div className="flex md:hidden items-center gap-2">
              <LanguageToggle language={language} setLanguage={setLanguage} />
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="p-2"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              <Button variant="ghost" className="w-full" asChild>
                <a href="/login">{t("nav_login")}</a>
              </Button>
              <Button
                className="w-full"
                asChild
                style={{ backgroundColor: "#1c2974" }}
              >
                <a href="/register">{t("nav_register")}</a>
              </Button>
            </div>
          )}
        </div>
      </nav>

      <motion.section
        initial="hidden"
        animate="show"
        variants={staggerContainerVariants}
        className="container mx-auto px-4 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            variants={fadeUpVariants}
            className="text-4xl font-bold tracking-tight sm:text-6xl"
            style={{ color: "#1c2974" }}
          >
            {t("hero_title")}
          </motion.h1>

          <motion.p
            variants={fadeUpVariants}
            className="mt-6 text-lg leading-8 text-muted-foreground"
          >
            {t("hero_subtitle")}
          </motion.p>

          <motion.div
            variants={fadeUpVariants}
            className="mt-10 flex flex-wrap gap-4 justify-center"
          >
            <Button size="lg" style={{ backgroundColor: "#1c2974" }}>
              {t("cta_trial")}
            </Button>
            <Button size="lg" variant="outline">
              {t("cta_demo")}
            </Button>
            <Button size="lg" variant="outline">
              {t("cta_sales")}
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#pricing">{t("cta_pricing")}</a>
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUpVariants}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="flex items-center gap-3 text-left">
              <Zap className="h-5 w-5 flex-shrink-0" style={{ color: "#1c2974" }} />
              <span className="text-sm">{t("benefit_1")}</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <MessageSquare
                className="h-5 w-5 flex-shrink-0"
                style={{ color: "#1c2974" }}
              />
              <span className="text-sm">{t("benefit_2")}</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <Shield className="h-5 w-5 flex-shrink-0" style={{ color: "#1c2974" }} />
              <span className="text-sm">{t("benefit_3")}</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("features_title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-6">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "#1c2974" }}
              >
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("feature_1_title")}
              </h3>
              <p className="text-muted-foreground">{t("feature_1_desc")}</p>
            </Card>

            <Card className="p-6">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "#1c2974" }}
              >
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("feature_2_title")}
              </h3>
              <p className="text-muted-foreground">{t("feature_2_desc")}</p>
            </Card>

            <Card className="p-6">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "#1c2974" }}
              >
                <LayoutTemplate className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("feature_3_title")}
              </h3>
              <p className="text-muted-foreground">{t("feature_3_desc")}</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("how_it_works_title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1, 2, 3].map((step) => (
              <div key={step} className="text-center">
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold"
                  style={{ backgroundColor: "#1c2974" }}
                >
                  {step}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {t(`step_${step}_title`)}
                </h3>
                <p className="text-muted-foreground">{t(`step_${step}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <MessageSquare
            className="h-16 w-16 mx-auto mb-6"
            style={{ color: "#1c2974" }}
          />
          <h2 className="text-3xl font-bold mb-4">
            {t("integrations_title")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("integrations_desc")}</p>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("pricing_title")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("pricing_subtitle")}
            </p>
          </div>

          <div className="flex justify-center mb-10 items-center gap-2">
            <span className="text-sm font-medium">{t("pricing_monthly")}</span>
            <Switch
              ref={switchRef}
              checked={isYearly}
              onCheckedChange={handleToggle}
            />
            <span className="text-sm font-medium">{t("pricing_yearly")}</span>
          </div>

          <div className="max-w-md mx-auto">
            <Card
              className="p-6 text-center border-2"
              style={{ borderColor: "#1c2974" }}
            >
              <p className="text-base font-semibold text-muted-foreground">
                Starter
              </p>
              <div className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight">
                  <NumberFlow
                    value={isYearly ? 1000000 : 100000}
                    format={{
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }}
                    formatter={(value) =>
                      `Rp${Number(value).toLocaleString("id-ID")}`
                    }
                    transformTiming={{
                      duration: 500,
                      easing: "ease-out",
                    }}
                    willChange
                  />
                </span>
                <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                  /{" "}
                  {isYearly
                    ? language === "en"
                      ? "year"
                      : "tahun"
                    : language === "en"
                    ? "month"
                    : "bulan"}
                </span>
              </div>

              <p className="text-xs leading-5 text-muted-foreground mt-2">
                {isYearly
                  ? language === "en"
                    ? "billed annually"
                    : "ditagih tahunan"
                  : language === "en"
                  ? "billed monthly"
                  : "ditagih bulanan"}
              </p>

              <ul className="mt-8 gap-3 flex flex-col text-left">
                <li className="flex items-start gap-2">
                  <Check
                    className="h-4 w-4 mt-1 flex-shrink-0"
                    style={{ color: "#1c2974" }}
                  />
                  <span className="text-sm">
                    {language === "en" ? "1 AI Agent" : "1 Agen AI"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className="h-4 w-4 mt-1 flex-shrink-0"
                    style={{ color: "#1c2974" }}
                  />
                  <span className="text-sm">
                    {language === "en"
                      ? "WhatsApp QR Connect"
                      : "Koneksi QR WhatsApp"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className="h-4 w-4 mt-1 flex-shrink-0"
                    style={{ color: "#1c2974" }}
                  />
                  <span className="text-sm">
                    {language === "en"
                      ? "Template Library Access"
                      : "Akses Perpustakaan Template"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className="h-4 w-4 mt-1 flex-shrink-0"
                    style={{ color: "#1c2974" }}
                  />
                  <span className="text-sm">
                    {language === "en" ? "Email Support" : "Dukungan Email"}
                  </span>
                </li>
              </ul>

              <Button
                className="w-full mt-8"
                size="lg"
                style={{ backgroundColor: "#1c2974" }}
              >
                {t("cta_trial")}
              </Button>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {t("pricing_plan_note")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("testimonials_title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((index) => (
              <Card key={index} className="p-6">
                <p className="text-muted-foreground mb-4">
                  &quot;{t(`testimonial_${index}`)}&quot;
                </p>
                <div className="font-semibold">
                  {t(`testimonial_${index}_name`)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(`testimonial_${index}_role`)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("faq_title")}
          </h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <details
                key={num}
                className="group rounded-lg border p-4 hover:bg-muted/50"
              >
                <summary className="flex cursor-pointer items-center justify-between font-semibold">
                  {t(`faq_${num}_q`)}
                  <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-muted-foreground">{t(`faq_${num}_a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6" style={{ color: "#1c2974" }} />
                <span className="text-xl font-bold">Clevio AI</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {language === "en"
                  ? "AI Employees for Indonesian SMEs"
                  : "Karyawan AI untuk UMKM Indonesia"}
              </p>
              <div className="flex gap-4">
                {[Facebook, Instagram, Twitter, Linkedin].map((Icon, index) => (
                  <a
                    key={Icon.name}
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Social link ${index + 1}`}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t("footer_company")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("footer_about")}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("footer_contact")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t("footer_resources")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/login"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("footer_login")}
                  </a>
                </li>
                <li>
                  <a
                    href="/register"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("footer_register")}
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("footer_pricing")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>{t("footer_copyright")}</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">
                {t("footer_privacy")}
              </a>
              <a href="#" className="hover:text-foreground">
                {t("footer_terms")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
