import { AuthForm } from '@/components/AuthForm';
import { Navbar } from '@/components/Navbar';

export default function Login() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthForm mode="login" />
    </div>
  );
}
