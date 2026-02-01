'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, Image, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface GalleryPasswordGateProps {
  onUnlock: () => void;
}

const GALLERY_UNLOCK_KEY = 'gallery_unlocked';
const GALLERY_UNLOCK_EXPIRY = 'gallery_unlock_expiry';
// La sesión de galería expira en 30 minutos
const SESSION_DURATION = 30 * 60 * 1000;

export function GalleryPasswordGate({ onUnlock }: GalleryPasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Verificar si ya está desbloqueado al cargar
  useEffect(() => {
    const checkUnlocked = () => {
      const unlocked = localStorage.getItem(GALLERY_UNLOCK_KEY);
      const expiry = localStorage.getItem(GALLERY_UNLOCK_EXPIRY);
      
      if (unlocked === 'true' && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          onUnlock();
        } else {
          // Expiró, limpiar
          localStorage.removeItem(GALLERY_UNLOCK_KEY);
          localStorage.removeItem(GALLERY_UNLOCK_EXPIRY);
        }
      }
    };
    
    checkUnlocked();
  }, [onUnlock]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Obtener usuario actual del localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      setIsLoading(false);
      return;
    }

    const user = JSON.parse(userData);

    try {
      // Verificar la contraseña usando el endpoint de login
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: user.username, 
          password 
        }),
      });

      if (response.ok) {
        // Guardar estado de desbloqueo con expiración
        localStorage.setItem(GALLERY_UNLOCK_KEY, 'true');
        localStorage.setItem(GALLERY_UNLOCK_EXPIRY, String(Date.now() + SESSION_DURATION));
        toast.success('Galería desbloqueada');
        onUnlock();
      } else {
        setError('Contraseña incorrecta');
        setShake(true);
        toast.error('Contraseña incorrecta');
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError('Error al verificar la contraseña');
      toast.error('Error de conexión');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        {/* Botón volver atrás */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        
        <Card className={`relative z-10 shadow-2xl border-2 ${shake ? 'animate-shake' : ''}`}>
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-2">
              <Image className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Galería Privada
            </CardTitle>
            <CardDescription className="text-center text-base">
              Ingresa tu contraseña para acceder a las fotos y videos
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="gallery-password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    id="gallery-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 text-base pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-3 rounded-md">
                  {error}
                </p>
              )}
              <Button 
                type="submit" 
                className="w-full h-11 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Desbloquear Galería'}
              </Button>
            </form>
            <p className="text-xs text-center text-muted-foreground mt-4">
              La sesión permanecerá activa por 30 minutos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Función para bloquear la galería manualmente
export function lockGallery() {
  localStorage.removeItem(GALLERY_UNLOCK_KEY);
  localStorage.removeItem(GALLERY_UNLOCK_EXPIRY);
}

// Función para verificar si la galería está desbloqueada
export function isGalleryUnlocked(): boolean {
  const unlocked = localStorage.getItem(GALLERY_UNLOCK_KEY);
  const expiry = localStorage.getItem(GALLERY_UNLOCK_EXPIRY);
  
  if (unlocked === 'true' && expiry) {
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() < expiryTime) {
      return true;
    }
    // Expiró, limpiar
    localStorage.removeItem(GALLERY_UNLOCK_KEY);
    localStorage.removeItem(GALLERY_UNLOCK_EXPIRY);
  }
  return false;
}
