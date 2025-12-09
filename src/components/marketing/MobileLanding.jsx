"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Poppins, Inter } from "next/font/google";
import {
  MessageCircle,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  ChevronRight,
  Star,
  Check,
  ArrowRight,
  Menu,
  X,
  Bot,
  BarChart,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Play,
  Sparkles,
  HeadphonesIcon,
  FileText,
  Smartphone,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"]
});

// Reusable Components
function Container({ children, className }) {
  return (
    <div className={cn("max-w-md mx-auto px-4", className)}>
      {children}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 focus:outline-none";

  const variants = {
    primary: "bg-[#214DB7] text-white shadow-lg hover:bg-[#1d3fa6]",
    secondary: "bg-white text-[#214DB7] border border-[#214DB7] hover:bg-[#f0f4ff]",
    ghost: "text-[#214DB7] hover:bg-[#f0f4ff]",
    gradient: "bg-gradient-to-r from-[#214DB7] to-[#2563EB] text-white shadow-lg hover:shadow-xl"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function MobileLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={cn("min-h-screen bg-white", inter.className)}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <Container className="py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#214DB7] rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className={cn("text-xl font-bold text-gray-900", poppins.className)}>
                Clevio
              </span>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </Container>
      </nav>

      {/* Hero Section - 1:1 Figma */}
      <section className="relative pt-20 pb-8">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFF] to-white pointer-events-none" />

        <Container className="relative">
          {/* Status Badge */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#E8F2FF] rounded-full border border-[#214DB7]/20">
              <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[#214DB7]">Ready for Automation</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-8">
            <h1 className={cn(
              "text-3xl font-bold text-gray-900 mb-4 leading-tight",
              poppins.className
            )}>
              Punya Banyak Customer?
              <br />
              <span className="text-[#214DB7]">Biar AI yang Handle</span>
            </h1>

            <p className="text-gray-600 text-base leading-relaxed max-w-sm mx-auto">
              AI Staff 24/7 untuk WhatsApp bisnis Anda. Automasi customer service & sales, hemat 80% biaya staf.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 mb-8 max-w-sm mx-auto">
            <Button size="lg" className="w-full h-14 text-base shadow-lg">
              🚀 Mulai Gratis 5 Hari
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button variant="secondary" size="lg" className="w-full h-14 text-base">
              ▶️ Lihat Demo 2 Menit
            </Button>
          </div>

          {/* Social Proof Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">500+</div>
              <div className="text-xs text-gray-600">Bisnis Aktif</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">50K+</div>
              <div className="text-xs text-gray-600">Chat/hari</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">95%</div>
              <div className="text-xs text-gray-600">Kepuasan</div>
            </div>
          </div>

          {/* Phone Mockup Placeholder */}
          <div className="relative max-w-xs mx-auto">
            <div className="aspect-[9/19] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[3rem] p-3 shadow-2xl border-8 border-gray-800">
              <div className="bg-white rounded-[2.5rem] h-full flex flex-col items-center justify-center p-6">
                {/* App Interface Mock */}
                <div className="w-16 h-16 bg-gradient-to-br from-[#214DB7] to-[#2563EB] rounded-2xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>

                <div className="text-center mb-4">
                  <div className="text-lg font-bold text-gray-900 mb-1">AI Staff Ready</div>
                  <div className="text-sm text-gray-600">24/7 Support</div>
                </div>

                {/* Chat Interface Mock */}
                <div className="w-full max-w-[200px] space-y-2">
                  <div className="bg-gray-100 rounded-2xl p-3 text-sm">
                    Hi! Ada yang bisa saya bantu? 😊
                  </div>
                  <div className="bg-[#214DB7] text-white rounded-2xl p-3 text-sm ml-auto max-w-[80%]">
                    Saya mau tanya produk
                  </div>
                  <div className="bg-gray-100 rounded-2xl p-3 text-sm">
                    Baik, saya akan bantu carikan produk yang sesuai 🛍️
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Quick Actions Section - 1:1 Figma */}
      <section className="py-8 bg-white">
        <Container>
          <div className="text-center mb-6">
            <h2 className={cn("text-xl font-bold text-gray-900 mb-2", poppins.className)}>
              Mau Automasi Apa Hari Ini?
            </h2>
            <p className="text-gray-600 text-sm">Pilih implementasi sesuai goal bisnis Anda</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm mb-1">Kirim Script</h3>
                  <p className="text-xs opacity-90">Custom Chatflow</p>
                </div>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs mb-3 opacity-95">Buat script alur chat otomatis</p>
              <Button size="sm" className="w-full bg-white text-red-500 hover:bg-gray-50 text-xs font-semibold h-8">
                Mulai Sekarang
              </Button>
            </div>

            <div className="bg-gradient-to-br from-[#214DB7] to-[#2563EB] rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm mb-1">AI Agent</h3>
                  <p className="text-xs opacity-90">Smart Response</p>
                </div>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs mb-3 opacity-95">AI yang belajar dari bisnis Anda</p>
              <Button size="sm" className="w-full bg-white text-[#214DB7] hover:bg-gray-50 text-xs font-semibold h-8">
                Setup AI Staff
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Grid - 1:1 Figma */}
      <section className="py-8 bg-gradient-to-br from-[#F0F4FF] to-white">
        <Container>
          <div className="text-center mb-6">
            <h2 className={cn("text-xl font-bold text-gray-900 mb-2", poppins.className)}>
              Fitur Andalan Clevio AI
            </h2>
            <p className="text-gray-600 text-sm">Semua yang Anda butuhkan untuk automasi WhatsApp</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Multi Agent</h3>
              <p className="text-xs text-gray-600">Beberapa AI untuk divisi berbeda</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">WhatsApp API</h3>
              <p className="text-xs text-gray-600">Integrasi resmi & aman</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                <BarChart className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Analytics</h3>
              <p className="text-xs text-gray-600">Monitor performa real-time</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Setup Cepat</h3>
              <p className="text-xs text-gray-600">Go live dalam 5 menit</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Testimonial Section - 1:1 Figma */}
      <section className="py-8 bg-white">
        <Container>
          <div className="bg-gradient-to-br from-[#214DB7] to-[#2563EB] rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Star className="w-7 h-7 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Testimoni Client</h3>
                <p className="text-sm opacity-90">Kata mereka tentang Clevio AI</p>
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">A</span>
                </div>
                <div>
                  <p className="font-semibold">Andi Wijaya</p>
                  <p className="text-xs opacity-80">CEO, TokoKu</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-3">
                "Konversi naik 120% setelah pakai AI Staff. Customer puas dengan respon cepat 24/7."
              </p>

              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">+120% Konversi</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">24/7 Support</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing Section - 1:1 Figma */}
      <section className="py-8 bg-gradient-to-br from-[#F0F4FF] to-white">
        <Container>
          <div className="text-center mb-6">
            <h2 className={cn("text-xl font-bold text-gray-900 mb-2", poppins.className)}>
              Harga Terjangkau
            </h2>
            <p className="text-gray-600 text-sm">Mulai gratis, upgrade kapan saja</p>
          </div>

          <div className="space-y-4">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Gratis</h3>
                  <p className="text-sm text-gray-600">5 hari trial penuh</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-[#214DB7] mb-4">Rp 0</div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>1 AI Agent</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>1000 chat/bulan</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>WhatsApp integration</span>
                </li>
              </ul>
              <Button className="w-full h-12 text-sm font-semibold">
                Coba Gratis
              </Button>
            </div>

            {/* Business Plan */}
            <div className="bg-gradient-to-br from-[#214DB7] to-[#2563EB] rounded-2xl p-4 text-white shadow-xl relative border-2 border-[#214DB7]">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
                  POPULER
                </span>
              </div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-white">Business</h3>
                  <p className="text-sm opacity-90">Untuk bisnis growing</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-4">Rp 299K/bln</div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span>5 AI Agents</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span>10,000 chat/bulan</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span>Custom automation</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Button className="w-full h-12 bg-white text-[#214DB7] hover:bg-gray-50 text-sm font-semibold">
                Pilih Business
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Enterprise</h3>
                  <p className="text-sm text-gray-600">Solusi khusus besar</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-4">Custom</div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited AI Agents</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited chat</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Dedicated server</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>White label</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>24/7 dedicated support</span>
                </li>
              </ul>
              <Button variant="secondary" className="w-full h-12 text-sm font-semibold">
                Hubungi Sales
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Final CTA Section - 1:1 Figma */}
      <section className="py-8 bg-gradient-to-br from-[#214DB7] to-[#2563EB]">
        <Container className="text-center">
          <h2 className={cn("text-2xl font-bold text-white mb-4", poppins.className)}>
            Siap Automasi Bisnis Anda?
          </h2>
          <p className="text-blue-100 mb-6 text-sm">
            Join 500+ bisnis yang sudah pakai AI Staff
          </p>
          <Button className="bg-white text-[#214DB7] hover:bg-gray-50 px-8 py-3 text-base font-semibold shadow-lg">
            🚀 Mulai Gratis Sekarang
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Container>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-white">
        <Container>
          <div className="space-y-6">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#214DB7] rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className={cn("text-xl font-bold", poppins.className)}>
                Clevio AI
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-400 text-sm leading-relaxed">
              AI Staff automation platform untuk WhatsApp bisnis Indonesia.
              Hemat 80% biaya, tingkatkan respon 3x lebih cepat.
            </p>

            {/* Contact */}
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>hello@clevio.id</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+62 812-3456-7890</span>
              </div>
            </div>

            {/* Bottom */}
            <div className="pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
              <p>© 2024 Clevio AI. All rights reserved.</p>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}