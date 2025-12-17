import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Upload, 
  FileText, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { isAuthenticated, user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/upload-key', label: 'Upload Key', icon: FileText },
    { href: '/upload-sheet', label: 'Upload Sheet', icon: Upload },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-md group-hover:shadow-lg transition-shadow">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Gradify
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:block text-sm text-muted-foreground">
                  Welcome, <span className="font-medium text-foreground">{user?.name}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button variant="default" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 animate-slide-up">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start gap-2 px-4"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button variant="default" asChild>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
