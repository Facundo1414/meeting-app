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
    <div className="w-full max-w-md lg:max-w-lg">
      <Card className={`relative z-10 shadow-2xl border-2 ${shake ? 'animate-shake' : ''}`}>
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-3xl lg:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Calendar
          </CardTitle>
          <CardDescription className="text-center text-base">
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium block">
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
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium block">
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
                className="h-11 text-base"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">{error}</p>
            )}
            <Button 
              type="submit" 
              className="w-full h-11 text-base relative overflow-hidden group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              <span className="relative z-10">
                {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
