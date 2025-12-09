"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Menu, Send, BatteryMedium, Wifi, Signal, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Clock = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{time}</span>;
};

export default function MobileLanding() {
  const [status, setStatus] = useState("initial"); // initial, interviewing, finished
  const [isChatOpen, setIsChatOpen] = useState(false); // Controls chat expansion
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const resultRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) {
        scrollToBottom();
    }
  }, [messages, isTyping, isChatOpen]);

  // Auto-scroll to result when finished
  useEffect(() => {
    if (status === "finished") {
      setIsChatOpen(false); // Auto-minimize when done
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }, [status]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMsg = { role: "user", text: inputValue };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setStatus("interviewing");
    setIsTyping(true);
    setIsChatOpen(true); // Ensure open on send

    // Dummy Interview Logic
    setTimeout(() => {
      let aiResponseText = "";
      if (messages.length === 0) {
        aiResponseText = "Menarik! Apa detail tugas spesifik yang harus dilakukan oleh staf AI ini?";
      } else if (messages.length === 2) {
        aiResponseText = "Baik, saya mengerti kebutuhan Anda. Sistem kami sedang menyiapkan demo yang cocok.";
      } else {
        // Finish condition
        setIsTyping(false);
        setStatus("finished");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: aiResponseText }]);
      setIsTyping(false);
    }, 1500); 
  };

  const handleInputFocus = () => {
      setIsChatOpen(true);
      if (status === 'initial') {
          // Optional: Can transition to 'interviewing' just by focus if desired, 
          // but usually kept to Send. Keeping as-is, just expanding.
      }
  };

  const handleBackgroundClick = () => {
      if (status === 'interviewing' && isChatOpen) {
          setIsChatOpen(false);
      }
  };

  return (
    // Outer container
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      
      {/* Mobile Frame Container */}
      <div className={`relative w-full max-w-[480px] bg-slate-900 font-sans shadow-2xl flex flex-col transition-all duration-500 ${status === 'finished' ? 'min-h-[150vh]' : 'h-[100dvh] overflow-hidden'}`}>
        
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 pt-0 supports-[padding-top:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]">
          <div className="relative h-20 w-20">
            <Image
              src="/clevioAISTAFF-Logo-White.png"
              alt="Clevio AI Staff"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <button className="text-white hover:text-gray-200 transition-colors">
            <Menu className="h-8 w-8" />
          </button>
        </header>

        {/* Hero Background */}
        <div className="relative h-[100dvh] w-full shrink-0" onClick={handleBackgroundClick}>
            <div className="absolute inset-0 z-0">
            <Image
                src="/landing-page/top-image.png"
                alt="AI Staff Background"
                fill
                className="object-cover object-top"
                priority
            />
            {/* Overlay logic: Darken when chat is OPEN to focus attention, light otherwise */}
            <div className={`absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 transition-opacity duration-500 ${isChatOpen ? 'opacity-0' : 'opacity-100'}`} />
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${isChatOpen ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-6 supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            
            {/* Headline - Show if initial OR (interviewing AND minimized) */}
            <AnimatePresence>
                {(!isChatOpen || status === "initial") && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-1 mb-8 text-center text-[#FFFFFF] absolute bottom-32 left-0 right-0 px-6 pointer-events-none"
                >
                    <h1 className="text-2xl sm:text-3xl font-medium leading-tight drop-shadow-lg">
                    Jika Anda bisa mudah
                    </h1>
                    <h1 className="text-2xl sm:text-3xl font-medium leading-tight drop-shadow-lg">
                    membuat staf dari AI
                    </h1>
                    <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide drop-shadow-lg mt-2">
                    APA PERAN AI ANDA?
                    </h2>
                </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Container */}
            <motion.div
                layout
                className={`relative w-full bg-white shadow-2xl overflow-hidden flex flex-col ${
                isChatOpen ? "rounded-t-3xl rounded-b-xl" : "rounded-full"
                }`}
                animate={{
                height: isChatOpen ? "65%" : "60px",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside chat
            >
                {/* Chat Messages - Visible when Open */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide ${!isChatOpen ? 'hidden' : ''}`}>
                    {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                        className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                            msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-100 text-gray-800 rounded-bl-none"
                        }`}
                        >
                        {msg.text}
                        </div>
                    </motion.div>
                    ))}
                    {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-none">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                        </div>
                        </div>
                    </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area or Finished State */}
                <div className={`relative flex items-center p-1.5 ${isChatOpen ? 'border-t border-gray-100 bg-white' : ''} shrink-0`}>
                    {status === 'finished' ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex items-center justify-between px-5 py-3 w-full bg-green-500 rounded-full"
                        >
                            <span className="text-white font-semibold text-base">Agent berhasil dibuat!</span>
                            <div className="bg-white/20 p-1 rounded-full">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        </motion.div>
                    ) : (
                        <>
                            <input
                                type="text"
                                suppressHydrationWarning
                                value={inputValue}
                                onFocus={handleInputFocus}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder={status === "initial" ? "Ketik disini......" : "Tulis jawaban..."}
                                className="flex-1 px-5 py-3 text-gray-800 bg-transparent outline-none placeholder:text-gray-400 text-base min-w-0"
                            />
                            <button 
                                onClick={handleSend}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white hover:bg-blue-700 transition-transform active:scale-95 shadow-md"
                                style={{ backgroundColor: "#2563EB" }}
                                aria-label="Kirim"
                            >
                                <Send className="h-5 w-5 ml-0.5" />
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
            </div>
        </div>
      
        {/* CSS Phone Result Section */}
        {status === "finished" && (
            <div ref={resultRef} className="relative w-full bg-white pb-20 pt-10 px-4 animate-in fade-in slide-in-from-bottom-20 duration-1000">
                
                {/* Professional Phone Component */}
                <div className="mx-auto w-full max-w-[340px] relative">
                    {/* Realistic Frame */}
                    <div className="relative bg-black rounded-[55px] p-3 shadow-2xl border-4 border-[#323232] ring-4 ring-gray-200/50">
                        {/* Side Buttons */}
                        <div className="absolute top-32 -left-2 w-1 h-8 bg-gray-800 rounded-l-md opacity-90"></div> {/* Vol Up */}
                        <div className="absolute top-44 -left-2 w-1 h-8 bg-gray-800 rounded-l-md opacity-90"></div> {/* Vol Down */}
                        <div className="absolute top-36 -right-2 w-1 h-12 bg-gray-800 rounded-r-md opacity-90"></div> {/* Power */}

                        {/* Screen Container */}
                        <div className="relative bg-white rounded-[45px] overflow-hidden h-full border border-gray-800/20">
                            
                            {/* Dynamic Island / Notch Area */}
                            <div className="absolute top-0 left-0 right-0 h-8 z-30 flex justify-center">
                                <div className="w-[120px] h-[28px] bg-black rounded-b-[18px] flex items-center justify-center">
                                    {/* Camera dot reflection hint */}
                                    <div className="w-16 h-2 bg-gray-800/50 rounded-full blur-[1px]"></div>
                                </div>
                            </div>

                            {/* Status Bar */}
                            <div className="flex justify-between items-center px-8 pt-3.5 pb-2 text-[10px] font-semibold text-gray-900 bg-white z-20 relative select-none">
                                <Clock />
                                <div className="flex gap-1.5 opacity-80">
                                    <Signal className="w-3.5 h-3.5" />
                                    <Wifi className="w-3.5 h-3.5" />
                                    <BatteryMedium className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            {/* App Header - Elegant */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
                                <div className="relative">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center border border-blue-50">
                                        <span className="text-xl">🤖</span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-base text-gray-900 leading-tight truncate">ralsi — asisten</h3>
                                    <p className="text-xs text-blue-600 font-medium">Online • Mengetik...</p>
                                </div>
                            </div>

                            {/* Chat Content Body - Elegant Spacing & Typography */}
                            <div className="bg-gray-50/50 h-[480px] p-5 space-y-4 overflow-y-auto font-sans">
                                <div className="text-xs text-center text-gray-400 mb-6 font-medium">Hari ini</div>
                                
                                <div className="flex justify-start">
                                    <div className="bg-white p-3.5 px-4 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] leading-relaxed text-gray-700 border border-gray-100 max-w-[85%]">
                                        Halo James 👋, saya <span className="font-semibold text-blue-600">ralsi</span>. Saya siap membantu mengelola tugas harian bisnis Anda secara otomatis.
                                    </div>
                                </div>

                                <div className="flex justify-start">
                                    <div className="bg-white p-3.5 px-4 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] leading-relaxed text-gray-700 border border-gray-100 max-w-[85%]">
                                        Dari <b>follow-up pelanggan</b>, <b>mencatat order</b>, sampai <b>menagih invoice</b>—semua bisa saya kerjakan 24/7 tanpa lelah.
                                    </div>
                                </div>

                                <div className="flex justify-start">
                                    <div className="bg-white p-3.5 px-4 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] leading-relaxed text-gray-700 border border-gray-100 max-w-[85%]">
                                        Ada yang bisa saya bantu mulai sekarang?
                                    </div>
                                </div>
                            </div>

                            {/* Fake Input Footer - Minimalist */}
                            <div className="p-4 bg-white border-t border-gray-50 absolute bottom-0 left-0 right-0 z-20">
                                <div className="flex items-center gap-3 bg-gray-50/80 rounded-full px-5 py-3 border border-gray-100">
                                    <span className="text-gray-400 text-xs font-medium flex-1">Tulis pesan...</span>
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-200">
                                        <Send className="w-3.5 h-3.5 ml-0.5" />
                                    </div>
                                </div>
                                {/* Home Indicator */}
                                <div className="mx-auto w-32 h-1 bg-gray-300 rounded-full mt-5"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}