// Server Component - renderiza estáticamente, mejor LCP
import { LoginForm } from '@/components/login-form';
import { DecorativeBackground } from '@/components/decorative-background';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      <DecorativeBackground />
      <LoginForm />
    </main>
  );
}
