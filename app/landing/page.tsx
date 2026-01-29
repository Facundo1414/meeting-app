'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Calendar, 
  MessageCircle, 
  Image as ImageIcon, 
  Gamepad2, 
  Heart, 
  Shield, 
  Smartphone,
  ChevronDown,
  Sparkles,
  Clock,
  Bell,
  Palette
} from 'lucide-react';

const features = [
  {
    icon: MessageCircle,
    title: 'Chat en Tiempo Real',
    description: 'Mensajes instantáneos con soporte para fotos, videos, audios y reacciones.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Calendar,
    title: 'Calendario Compartido',
    description: 'Coordina disponibilidad y marca tus horarios libres u ocupados fácilmente.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: ImageIcon,
    title: 'Galería Privada',
    description: 'Comparte y guarda fotos y videos en un espacio seguro solo para ustedes.',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: Gamepad2,
    title: 'Minijuegos',
    description: 'Diviértanse juntos con juegos integrados como Pictionary.',
    color: 'from-green-500 to-emerald-500'
  }
];

const highlights = [
  { icon: Heart, text: 'Diseñada para parejas' },
  { icon: Shield, text: 'Privacidad total' },
  { icon: Smartphone, text: 'Mobile-first' },
  { icon: Clock, text: 'Sincronización instantánea' },
  { icon: Bell, text: 'Notificaciones inteligentes' },
  { icon: Palette, text: 'Interfaz moderna' }
];

const screenshots = [
  { title: 'Chat', emoji: '💬' },
  { title: 'Calendario', emoji: '📅' },
  { title: 'Galería', emoji: '📸' },
  { title: 'Juegos', emoji: '🎮' }
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[128px]"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[128px]"
          style={{ transform: `translateY(${-scrollY * 0.05}px)` }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[100px]"
          style={{ transform: `translate(-50%, -50%) translateY(${scrollY * 0.08}px)` }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <diImage 
              src="/meetingapp.png" 
              alt="MeetingApp Logo" 
              width={36} 
              height={36}
              className="rounded-lg"
            /art className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">MeetingApp</span>
          </div>
          <Link 
            href="/"
            className="px-4 py-2 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-white/70">Tu espacio privado para dos</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Todo lo que necesitan
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              en un solo lugar
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Chat, calendario, galería y juegos. Una app pensada para parejas que quieren mantenerse conectadas.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/"
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-lg overflow-hidden transition-transform hover:scale-105"
            >
              <span className="relative z-10">Comenzar Ahora</span>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <a 
              href="#features"
              className="px-8 py-4 rounded-2xl border border-white/20 font-semibold text-lg hover:bg-white/5 transition-colors"
            >
              Ver Más
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/40" />
        </div>

        {/* Phone mockup */}
        <div className="mt-16 relative">
          <div className="w-[280px] h-[560px] rounded-[3rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/20 p-2 shadow-2xl">
            <div className="w-full h-full rounded-[2.5rem] bg-[#111B21] overflow-hidden flex flex-col">
              {/* Status bar mockup */}
              <div className="h-8 bg-[#1F2C34] flex items-center justify-center">
                <div className="w-20 h-4 rounded-full bg-black" />
              </div>
              {/* Chat preview */}
              <div className="flex-1 p-3 space-y-2">
                <div className="flex justify-start">
                  <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2 max-w-[70%]">
                    <p className="text-sm">Hola amor! 💕</p>
                    <p className="text-[10px] text-white/40 text-right">10:30</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#005C4B] rounded-lg rounded-tr-none px-3 py-2 max-w-[70%]">
                    <p className="text-sm">Hola! Cómo estás? 😊</p>
                    <p className="text-[10px] text-white/40 text-right">10:31 ✓✓</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2 max-w-[70%]">
                    <p className="text-sm">Nos vemos a las 8?</p>
                    <p className="text-[10px] text-white/40 text-right">10:32</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#005C4B] rounded-lg rounded-tr-none px-3 py-2 max-w-[70%]">
                    <p className="text-sm">Dale! Te espero ❤️</p>
                    <p className="text-[10px] text-white/40 text-right">10:33 ✓✓</p>
                  </div>
                </div>
              </div>
              {/* Input mockup */}
              <div className="p-2">
                <div className="h-10 rounded-full bg-[#202C33] flex items-center px-4">
                  <span className="text-white/40 text-sm">Escribe un mensaje...</span>
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full scale-75" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Todo lo que necesitan
            </h2>
            <p className="text-white/60 text-lg max-w-xl mx-auto">
              Funciones diseñadas pensando en la conexión entre dos personas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group relative p-6 rounded-3xl border transition-all duration-500 cursor-pointer ${
                    activeFeature === index 
                      ? 'border-white/20 bg-white/5' 
                      : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                  
                  {/* Active indicator */}
                  {activeFeature === index && (
                    <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 -z-10" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5"
                >
                  <Icon className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-white/80">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Screenshots Preview */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Explora las funciones
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {screenshots.map((screen, index) => (
              <div 
                key={index}
                className="aspect-[9/16] rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex flex-col items-center justify-center gap-4 hover:border-white/20 transition-colors"
              >
                <span className="text-5xl">{screen.emoji}</span>
                <span className="text-sm text-white/60">{screen.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-8 sm:p-12 rounded-[2rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Listos para empezar?
            </h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Únanse hoy y descubran una nueva forma de mantenerse conectados.
            </p>
            <Link 
              href="/"
              className="inline-flex px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              Comenzar Ahora →
            </Link>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl" />
          </div>
        </div>
      </section>
Image 
              src="/meetingapp.png" 
              alt="MeetingApp Logo" 
              width={24} 
              height={24}
              className="rounded-md"
            /ssName="relative py-8 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold">MeetingApp</span>
          </div>
          <p className="text-sm text-white/40">
            Hecho con ❤️ para parejas
          </p>
        </div>
      </footer>
    </div>
  );
}
