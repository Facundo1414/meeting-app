'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('¡Bienvenido!');
      router.push('/calendar');
    } else {
      setError('Usuario o contraseña incorrectos');
      setShake(true);
      toast.error('Credenciales incorrectas');
      setTimeout(() => setShake(false), 500);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className={`relative z-10 shadow-xl ${shake ? 'animate-shake' : ''}`}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Calendar
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button 
              type="submit" 
              className="w-full relative overflow-hidden group"
              disabled={isLoading}
            >
              <span className="relative z-10">
                {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
              </span>
              {!isLoading && (
                <span className="absolute inset-0 bg-linear-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
