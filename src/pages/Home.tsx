import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { useApp } from '@/context/AppContext';
import { 
  GraduationCap, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle,
  ArrowRight,
  Brain,
  Zap,
  Shield
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();

  const handleProtectedNavigation = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/login');
    }
  };
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Evaluation',
      description: 'Advanced language models analyze and grade answers with human-like understanding.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Process hundreds of answer sheets in minutes, not hours.',
    },
    {
      icon: Shield,
      title: 'Accurate & Fair',
      description: 'Consistent grading criteria ensuring fair evaluation for all students.',
    },
  ];

  const steps = [
    { number: '01', title: 'Upload Answer Key', description: 'Set the benchmark with model answers' },
    { number: '02', title: 'Scan Student Sheets', description: 'Capture or upload answer sheets' },
    { number: '03', title: 'AI Evaluation', description: 'Get instant, detailed grading results' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative gradient-hero overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20 sm:py-32 relative">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              AI-Powered Grading System
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Gradify
              <span className="block mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Automated Answer Sheet Evaluation
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your grading workflow with AI. Upload answer sheets, 
              get instant evaluations, and save countless hours of manual work.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => handleProtectedNavigation('/upload-key')}
                className="gap-2"
              >
                <FileText className="h-5 w-5" />
                Upload Answer Key
              </Button>
              <Button 
                variant="hero-outline" 
                size="xl" 
                onClick={() => handleProtectedNavigation('/upload-sheet')}
                className="gap-2"
              >
                <Upload className="h-5 w-5" />
                Upload Student Sheets
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex items-center justify-center gap-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm">99% Accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm">Instant Results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm">Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Why Choose Gradify?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Experience the future of education assessment with our cutting-edge AI technology.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-primary shadow-lg mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to revolutionize your grading process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary text-primary-foreground font-display text-xl font-bold mb-4 shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 text-muted-foreground/30 h-8 w-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center gradient-primary rounded-3xl p-12 shadow-xl">
            <GraduationCap className="h-16 w-16 text-primary-foreground mx-auto mb-6" />
            <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Grading?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join thousands of educators who have already simplified their evaluation process with Gradify.
            </p>
            <Button 
              size="xl" 
              className="bg-background text-primary hover:bg-background/90 shadow-xl"
              asChild
            >
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-foreground">Gradify</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Gradify. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
