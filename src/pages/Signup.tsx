import { AuthForm } from '@/components/AuthForm';
import { Navbar } from '@/components/Navbar';

export default function Signup() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthForm mode="signup" />
    </div>
  );
}
