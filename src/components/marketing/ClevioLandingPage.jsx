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
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Facebook,
  Instagram,
  LayoutTemplate,
  Linkedin,
  Maximize2,
  Menu,
  MessageSquare,
  Pause,
  Play,
  QrCode,
  Shield,
  Sparkles,
  Twitter,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

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
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold tracking-tight ring-offset-background transition-all duration-200 ease-out shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0";
    const variants = {
      default:
        "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90",
      outline:
        "border border-border bg-background text-primary hover:bg-primary/10",
      ghost: "text-foreground hover:bg-accent/10 hover:text-primary",
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

const Card = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-border bg-card text-card-foreground shadow-lg shadow-primary/5 transition-all duration-300 ease-out",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const MotionCard = motion.create(Card);

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const STAGGER_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const PRODUCT_VIDEO_SOURCE = {
  src: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
  poster:
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1920&q=80",
  durationLabel: "02:03",
};

const translations = {
  hero_tagline: {
    en: "WhatsApp-ready automation for Indonesian SMEs",
    id: "Otomasi WhatsApp untuk UMKM Indonesia",
  },
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
  cta_pricing: {
    en: "Explore Pricing",
    id: "Lihat Harga",
  },
  nav_login: {
    en: "Login",
    id: "Masuk",
  },
  nav_register: {
    en: "Register",
    id: "Daftar",
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
    en: "Template Agents",
    id: "Agen Template",
  },
  feature_3_desc: {
    en: "Choose from pre-built agent templates for sales, support, and operations. Customize them to fit your business and launch instantly.",
    id: "Pilih dari template agen yang sudah jadi untuk penjualan, dukungan, dan operasi. Sesuaikan dengan bisnis Anda dan luncurkan secara instan.",
  },
  product_video_badge: {
    en: "Product preview",
    id: "Pratinjau produk",
  },
  product_video_title: {
    en: "See Clevio AI in Action",
    id: "Lihat Clevio AI Beraksi",
  },
  product_video_subtitle: {
    en: "Explore the redesigned experience for launching WhatsApp-ready AI agents.",
    id: "Jelajahi pengalaman baru untuk meluncurkan agen AI siap WhatsApp.",
  },
  product_video_overlay_title: {
    en: "Clevio AI",
    id: "Clevio AI",
  },
  product_video_overlay_subtitle: {
    en: "Coding & Design",
    id: "Coding & Design",
  },
  product_video_play: {
    en: "Play product demo",
    id: "Putar demo produk",
  },
  product_video_pause: {
    en: "Pause demo",
    id: "Jeda demo",
  },
  product_video_caption: {
    en: "Captured inside the WhatsApp agent workspace. Replace this video anytime.",
    id: "Diambil di workspace agen WhatsApp. Ganti video ini kapan pun.",
  },
  product_video_mute: {
    en: "Mute video",
    id: "Bisukan video",
  },
  product_video_unmute: {
    en: "Unmute video",
    id: "Aktifkan suara video",
  },
  product_video_fullscreen: {
    en: "Toggle fullscreen",
    id: "Alihkan layar penuh",
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
  pricing_plan_note: {
    en: "Perfect for small businesses getting started with AI automation",
    id: "Sempurna untuk bisnis kecil yang memulai otomasi AI",
  },
  pricing_free: {
    en: "Free",
    id: "Gratis",
  },
  pricing_monthly: {
    en: "Monthly",
    id: "Bulanan",
  },
  pricing_yearly: {
    en: "Yearly",
    id: "Tahunan",
  },
  pricing_free_desc: {
    en: "Experience core automation and launch your first WhatsApp agent.",
    id: "Rasakan otomasi inti dan luncurkan agen WhatsApp pertama Anda.",
  },
  pricing_monthly_desc: {
    en: "Grow your team with advanced templates, analytics, and support.",
    id: "Kembangkan tim Anda dengan template, analitik, dan dukungan lanjutan.",
  },
  pricing_yearly_desc: {
    en: "Scale confidently with unlimited agents and dedicated guidance.",
    id: "Skalakan dengan percaya diri dengan agen tanpa batas dan pendampingan khusus.",
  },
  pricing_badge_popular: {
    en: "Most popular",
    id: "Paling populer",
  },
  pricing_yearly_bonus: {
    en: "Most Cheap",
    id: "Paling Hemat",
  },
  pricing_cta_start: {
    en: "Get started",
    id: "Mulai sekarang",
  },
  pricing_cta_upgrade: {
    en: "Upgrade now",
    id: "Upgrade sekarang",
  },
  pricing_cta_scale: {
    en: "Buy now",
    id: "Beli sekarang",
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
  footer_privacy: {
    en: "Privacy Policy",
    id: "Kebijakan Privasi",
  },
  footer_terms: {
    en: "Terms of Service",
    id: "Syarat Layanan",
  },
  footer_tagline: {
    en: "AI Employees for Indonesian SMEs",
    id: "Karyawan AI untuk UMKM Indonesia",
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
          "flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-sm text-foreground shadow-sm backdrop-blur transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md"
        )}
      >
        <span>{selected?.flag}</span>
        <span className="hidden sm:inline">{selected?.label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur"
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
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                selected?.code === lang.code
                  ? "font-semibold text-primary bg-primary/10"
                  : "text-foreground hover:bg-primary/5"
              )}
            >
              <span>{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {selected?.code === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ClevioLandingPage() {
  const router = useRouter();
  const { startTrialSession } = useAuth();
  const [language, setLanguage] = useState("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");
  const [publicIp, setPublicIp] = useState(null);
  const productVideoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = !prefersReducedMotion;

  const t = useCallback(
    (key) => translations[key]?.[language] ?? key,
    [language]
  );

  const formatVideoTime = useCallback((seconds) => {
    if (!Number.isFinite(seconds)) {
      return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  const handleVideoTimeUpdate = useCallback(() => {
    const media = productVideoRef.current;
    if (!media) return;
    setVideoTime(media.currentTime);
    if (Number.isFinite(media.duration)) {
      setVideoDuration(media.duration);
    }
  }, []);

  const toggleVideoPlayback = useCallback(() => {
    const media = productVideoRef.current;
    if (!media) return;
    if (media.paused) {
      media.play().catch(() => {});
    } else {
      media.pause();
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    setIsVideoPlaying(false);
    setVideoTime(0);
  }, []);

  const handleProgressClick = useCallback((event) => {
    const media = productVideoRef.current;
    if (!media || !Number.isFinite(media.duration)) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);
    media.currentTime = ratio * media.duration;
    setVideoTime(media.currentTime);
  }, []);

  const toggleMute = useCallback(() => {
    const media = productVideoRef.current;
    if (!media) return;
    const nextMuted = !isVideoMuted;
    media.muted = nextMuted;
    setIsVideoMuted(nextMuted);
  }, [isVideoMuted]);

  const handleFullscreen = useCallback(() => {
    const media = productVideoRef.current;
    if (!media || typeof document === "undefined") {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    media.requestFullscreen?.();
  }, []);

  const videoProgress = videoDuration
    ? Math.min((videoTime / videoDuration) * 100, 100)
    : 0;
  const displayedCurrentTime = formatVideoTime(videoTime);
  const displayedDuration = videoDuration
    ? formatVideoTime(videoDuration)
    : PRODUCT_VIDEO_SOURCE.durationLabel ?? "00:00";

  const socialLinks = useMemo(
    () => [
      { id: "facebook", icon: Facebook },
      { id: "instagram", icon: Instagram },
      { id: "twitter", icon: Twitter },
      { id: "linkedin", icon: Linkedin },
    ],
    []
  );

  const featureItems = useMemo(
    () => [
      {
        icon: Sparkles,
        titleKey: "feature_1_title",
        descriptionKey: "feature_1_desc",
      },
      {
        icon: QrCode,
        titleKey: "feature_2_title",
        descriptionKey: "feature_2_desc",
      },
      {
        icon: LayoutTemplate,
        titleKey: "feature_3_title",
        descriptionKey: "feature_3_desc",
      },
    ],
    []
  );

  const pricingPlans = useMemo(
    () => [
      {
        id: "free",
        title: t("pricing_free"),
        description: t("pricing_free_desc"),
        priceDisplay: language === "en" ? "Free" : "Gratis",
        priceSuffix: "",
        cta: t("pricing_cta_start"),
        variant: "outline",
        features:
          language === "en"
            ? [
                "1 AI agent",
                "WhatsApp QR connect",
                "Starter templates",
                "Community email support",
              ]
            : [
                "1 Agen AI",
                "Koneksi QR WhatsApp",
                "Template dasar",
                "Dukungan email komunitas",
              ],
      },
      {
        id: "monthly",
        title: t("pricing_monthly"),
        description: t("pricing_monthly_desc"),
        price: 100000,
        priceSuffix: language === "en" ? "/ month" : "/ bulan",
        badge: t("pricing_badge_popular"),
        cta: t("pricing_cta_upgrade"),
        variant: "default",
        features:
          language === "en"
            ? [
                "Up to 5 AI agents",
                "Advanced templates & analytics",
                "Priority chat support",
                "Workflow automations",
              ]
            : [
                "Hingga 5 agen AI",
                "Template & analitik lanjutan",
                "Dukungan chat prioritas",
                "Automasi alur kerja",
              ],
      },
      {
        id: "yearly",
        title: t("pricing_yearly"),
        description: t("pricing_yearly_desc"),
        price: 1000000,
        priceSuffix: language === "en" ? "/ year" : "/ tahun",
        badge: t("pricing_yearly_bonus"),
        cta: t("pricing_cta_scale"),
        variant: "outline",
        features:
          language === "en"
            ? [
                "Unlimited AI agents",
                "Dedicated onboarding",
                "Custom integrations",
                "Success manager support",
              ]
            : [
                "Agen AI tanpa batas",
                "Onboarding khusus",
                "Integrasi kustom",
                "Dukungan success manager",
              ],
      },
    ],
    [language, t]
  );

  useEffect(() => {
    let active = true;
    const loadIp = async () => {
      try {
        const response = await fetch("/api/ip", { cache: "no-store" });
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          if (data?.ip) {
            setPublicIp(data.ip);
          }
        }
      } catch (error) {
        console.warn("[ClevioLandingPage] Unable to determine client IP", error);
      }
    };
    loadIp();
    return () => {
      active = false;
    };
  }, []);

  const handleStartTrial = async () => {
    if (trialLoading) {
      return;
    }
    setTrialLoading(true);
    setTrialError("");
    try {
      const response = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_user: publicIp }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Unable to start trial");
      }

      startTrialSession?.({
        apiKey: data.apiKey,
        planCode: data.planCode,
        expiresAt: data.expiresAt,
        ipAddress: data.ip,
        metadata: data.raw,
      });

      router.push("/trial/templates");
    } catch (error) {
      setTrialError(error.message || "Unable to start trial");
    } finally {
      setTrialLoading(false);
    }
  };

  const heroMotion = canAnimate ? { initial: "hidden", animate: "show" } : {};

  const sectionMotion = canAnimate
    ? {
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, amount: 0.2 },
      }
    : {};

  const cardMotionProps = canAnimate
    ? { whileHover: { y: -8, scale: 1.01 }, whileTap: { scale: 0.99 } }
    : {};

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-gradient-to-b from-primary/20 via-accent-sky/10 to-transparent blur-3xl"
      />

      <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <Image
              src="/clevioAIAssistantsLogo.png"
              alt="Clevio AI Assistants"
              width={150}
              height={50}
              className="h-auto w-[150px]"
              priority
            />
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <LanguageToggle language={language} setLanguage={setLanguage} />
            <Button variant="ghost" asChild>
              <a href="/login">{t("nav_login")}</a>
            </Button>
            <Button asChild>
              <a href="/register">{t("nav_register")}</a>
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle language={language} setLanguage={setLanguage} />
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="rounded-full border border-border bg-card/80 p-2 text-foreground shadow-sm transition-colors hover:bg-primary/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border/60 bg-background/95 px-4 py-4 shadow-sm md:hidden">
            <div className="space-y-2">
              <Button variant="ghost" className="w-full" asChild>
                <a href="/login">{t("nav_login")}</a>
              </Button>
              <Button className="w-full" asChild>
                <a href="/register">{t("nav_register")}</a>
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main>
        <motion.section
          {...heroMotion}
          variants={STAGGER_CONTAINER_VARIANTS}
          className="container mx-auto px-4 pb-24 pt-20 sm:pt-28"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-accent-sky/10 px-6 py-16 shadow-xl shadow-primary/10 sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 top-8 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 bottom-12 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
            />

            <motion.h1
              variants={FADE_UP_VARIANTS}
              className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl"
            >
              {t("hero_title")}
            </motion.h1>

            <motion.p
              variants={FADE_UP_VARIANTS}
              className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
            >
              {t("hero_subtitle")}
            </motion.p>

            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Button
                type="button"
                size="lg"
                onClick={handleStartTrial}
                disabled={trialLoading}
                aria-busy={trialLoading}
              >
                {trialLoading
                  ? language === "en"
                    ? "Starting…"
                    : "Memulai…"
                  : t("cta_trial")}
              </Button>
              <Button size="lg" variant="outline">
                {t("cta_demo")}
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <a href="#pricing">{t("cta_pricing")}</a>
              </Button>
            </motion.div>

            {trialError && (
              <motion.p
                variants={FADE_UP_VARIANTS}
                className="mt-4 text-sm font-medium text-destructive"
              >
                {trialError}
              </motion.p>
            )}

            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {[
                { icon: Zap, text: t("benefit_1") },
                { icon: MessageSquare, text: t("benefit_2") },
                { icon: Shield, text: t("benefit_3") },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm transition-colors hover:border-accent/60 hover:bg-primary/5"
                >
                  <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-foreground">{text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          {...sectionMotion}
          variants={STAGGER_CONTAINER_VARIANTS}
          className="container mx-auto px-4 pb-20"
        >
          <motion.div
            variants={FADE_UP_VARIANTS}
            className="mx-auto max-w-xl text-center"
          >
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t("features_title")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("pricing_plan_note")}
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {featureItems.map(({ icon: Icon, titleKey, descriptionKey }) => (
              <MotionCard
                key={titleKey}
                variants={FADE_UP_VARIANTS}
                {...cardMotionProps}
                className="h-full border-border/60 bg-card/95 p-6 hover:border-primary/60 hover:shadow-xl"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/40">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-foreground">
                  {t(titleKey)}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t(descriptionKey)}
                </p>
              </MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section
          {...sectionMotion}
          variants={STAGGER_CONTAINER_VARIANTS}
          className="relative overflow-hidden bg-[#050505] py-20"
        >
          <div className="container mx-auto px-4">
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-3xl text-center text-white"
            >
              <span className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                {t("product_video_badge")}
              </span>
              <h2 className="mt-6 text-4xl font-bold sm:text-5xl">
                {t("product_video_title")}
              </h2>
              <p className="mt-4 text-lg text-white/70">
                {t("product_video_subtitle")}
              </p>
            </motion.div>

            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto mt-12 max-w-5xl"
            >
              <div className="rounded-[42px] bg-gradient-to-br from-white/15 via-white/5 to-transparent p-1 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
                <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black">
                  <video
                    ref={productVideoRef}
                    src={PRODUCT_VIDEO_SOURCE.src}
                    poster={PRODUCT_VIDEO_SOURCE.poster}
                    className="block h-full w-full object-cover"
                    muted={isVideoMuted}
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleVideoTimeUpdate}
                  />

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white mix-blend-screen">
                    <p className="text-4xl font-semibold tracking-tight sm:text-6xl">
                      {t("product_video_overlay_title")}
                    </p>
                    <p className="text-2xl font-semibold text-white/80 sm:text-4xl">
                      {t("product_video_overlay_subtitle")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleVideoPlayback}
                    aria-pressed={isVideoPlaying}
                    className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {isVideoPlaying ? (
                      <Pause className="h-7 w-7" />
                    ) : (
                      <Play className="h-7 w-7 translate-x-0.5" />
                    )}
                    <span className="sr-only">
                      {isVideoPlaying
                        ? t("product_video_pause")
                        : t("product_video_play")}
                    </span>
                  </button>

                  <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center gap-4 text-white/80">
                    <div
                      className="relative flex-1 cursor-pointer rounded-full bg-white/20 p-0.5"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(videoProgress)}
                      onClick={handleProgressClick}
                    >
                      <span
                        className="block h-1 rounded-full bg-white"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                      {displayedCurrentTime} | {displayedDuration}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        aria-pressed={isVideoMuted}
                      >
                        {isVideoMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {isVideoMuted
                            ? t("product_video_unmute")
                            : t("product_video_mute")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFullscreen}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        aria-label={t("product_video_fullscreen")}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-center text-sm text-white/60">
                {t("product_video_caption")}
              </p>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          {...sectionMotion}
          variants={STAGGER_CONTAINER_VARIANTS}
          className="bg-primary/5 py-20"
        >
          <div className="container mx-auto px-4">
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-2xl text-center"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40">
                <MessageSquare className="h-7 w-7" />
              </span>
              <h2 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl">
                {t("integrations_title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("integrations_desc")}
              </p>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="pricing"
          {...sectionMotion}
          variants={STAGGER_CONTAINER_VARIANTS}
          className="container mx-auto px-4 py-20"
        >
          <motion.div
            variants={FADE_UP_VARIANTS}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
              {t("pricing_title")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("pricing_subtitle")}
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {pricingPlans.map(
              ({
                id,
                title,
                description,
                price,
                priceSuffix,
                priceDisplay,
                cta,
                features,
                badge,
                variant,
              }) => (
                <MotionCard
                  key={id}
                  variants={FADE_UP_VARIANTS}
                  {...cardMotionProps}
                  className={cn(
                    "flex h-full flex-col border-border/60 bg-card/95 p-8 hover:border-primary/60",
                    variant === "default"
                      ? "border-primary/60 bg-primary text-primary-foreground shadow-xl shadow-primary/30"
                      : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground md:text-primary-foreground/80">
                        {title}
                      </p>
                      <p
                        className={cn(
                          "mt-3 text-sm",
                          variant === "default"
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {description}
                      </p>
                    </div>
                    {badge && (
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                          variant === "default"
                            ? "bg-primary-foreground/10 text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-8 flex items-baseline gap-2">
                    {price !== undefined ? (
                      <>
                        <span className="text-5xl font-bold tracking-tight">
                          <NumberFlow
                            value={price}
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
                              duration: 600,
                              easing: "ease-out",
                            }}
                            willChange={canAnimate}
                          />
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            variant === "default"
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {priceSuffix}
                        </span>
                      </>
                    ) : (
                      <span className="text-5xl font-bold tracking-tight">
                        {priceDisplay}
                      </span>
                    )}
                  </div>

                  <ul
                    className={cn(
                      "mt-8 flex flex-1 flex-col gap-3 text-sm",
                      variant === "default"
                        ? "text-primary-foreground/90"
                        : "text-foreground"
                    )}
                  >
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                            variant === "default"
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={variant}
                    className={cn(
                      "mt-8 w-full",
                      variant === "default"
                        ? "bg-primary-foreground text-primary shadow-none hover:bg-primary-foreground/80"
                        : ""
                    )}
                  >
                    {cta}
                  </Button>
                </MotionCard>
              )
            )}
          </div>
        </motion.section>

        <motion.section
          {...sectionMotion}
          variants={STAGGER_CONTAINER_VARIANTS}
          className="bg-primary/5 py-20"
        >
          <div className="container mx-auto px-4">
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-xl text-center"
            >
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                {t("testimonials_title")}
              </h2>
            </motion.div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[1, 2, 3].map((index) => (
                <MotionCard
                  key={index}
                  variants={FADE_UP_VARIANTS}
                  {...cardMotionProps}
                  className="border-border/60 bg-card/95 p-6 text-left hover:border-primary/60"
                >
                  <p className="text-sm text-muted-foreground">
                    &ldquo;{t(`testimonial_${index}`)}&rdquo;
                  </p>
                  <div className="mt-4 font-semibold text-foreground">
                    {t(`testimonial_${index}_name`)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`testimonial_${index}_role`)}
                  </div>
                </MotionCard>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          {...sectionMotion}
          variants={STAGGER_CONTAINER_VARIANTS}
          className="container mx-auto px-4 py-20"
        >
          <motion.div
            variants={FADE_UP_VARIANTS}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t("faq_title")}
            </h2>
          </motion.div>

          <div className="mt-12 space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <motion.details
                key={num}
                variants={FADE_UP_VARIANTS}
                className="group overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm transition-all duration-200 hover:border-primary/60"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold text-foreground">
                  <span>{t(`faq_${num}_q`)}</span>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {t(`faq_${num}_a`)}
                </p>
              </motion.details>
            ))}
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-border/70 bg-background/90 py-14">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center">
                <Image
                  src="/clevioAIAssistantsLogo.png"
                  alt="Clevio AI Assistants"
                  width={180}
                  height={60}
                  className="h-auto w-[180px]"
                />
              </div>
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                {t("footer_tagline")}
              </p>
              <div className="mt-6 flex gap-4">
                {socialLinks.map(({ id, icon: Icon }) => (
                  <a
                    key={id}
                    href="#"
                    aria-label={id}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("footer_company")}
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a className="transition-colors hover:text-primary" href="#">
                    {t("footer_about")}
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-primary" href="#">
                    {t("footer_contact")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("footer_resources")}
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    className="transition-colors hover:text-primary"
                    href="/login"
                  >
                    {t("footer_login")}
                  </a>
                </li>
                <li>
                  <a
                    className="transition-colors hover:text-primary"
                    href="/register"
                  >
                    {t("footer_register")}
                  </a>
                </li>
                <li>
                  <a
                    className="transition-colors hover:text-primary"
                    href="#pricing"
                  >
                    {t("footer_pricing")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row">
            <p>
              © {new Date().getFullYear()} Clevio AI Employees. All rights
              reserved.
            </p>
            <div className="flex gap-4">
              <a className="transition-colors hover:text-primary" href="#">
                {t("footer_privacy")}
              </a>
              <a className="transition-colors hover:text-primary" href="#">
                {t("footer_terms")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
