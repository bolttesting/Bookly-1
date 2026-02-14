import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useReviews } from "@/hooks/useReviews";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useFooterLinks } from "@/hooks/useFooterLinks";
import { useEffect, useRef, useState } from "react";
import { formatCurrencySimple, getCurrencyByCode } from "@/lib/currency";
import { Loader2 } from "lucide-react";
import { 
  Calendar, 
  Users, 
  Clock, 
  BarChart3, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Star,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Award,
  Globe,
  Smartphone,
  CreditCard,
  MessageSquare,
  Heart,
  Menu,
  X,
  FileText,
  ChevronUp
} from "lucide-react";

const Landing = () => {
  const [statsVisible, setStatsVisible] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const { plans: subscriptionPlans, isLoading: plansLoading } = useSubscriptionPlans();
  
  // Scroll animations for sections
  const [heroRef, heroVisible] = useScrollAnimation({ threshold: 0.2 });
  const [featuresRef, featuresVisible] = useScrollAnimation({ threshold: 0.1 });
  const [aboutRef, aboutVisible] = useScrollAnimation({ threshold: 0.2 });
  const [servicesRef, servicesVisible] = useScrollAnimation({ threshold: 0.1 });
  const [testimonialsRef, testimonialsVisible] = useScrollAnimation({ threshold: 0.2 });
  const [pricingRef, pricingVisible] = useScrollAnimation({ threshold: 0.2 });
  const [contactRef, contactVisible] = useScrollAnimation({ threshold: 0.2 });
  const [blogRef, blogVisible] = useScrollAnimation({ threshold: 0.2 });
  const { settings: siteSettings } = useSiteSettings();
  const { reviews } = useReviews();
  const { posts: blogPosts } = useBlogPosts(false);
  const { links: footerLinks } = useFooterLinks();
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Count-up animations for stats
  const [usersCount, startUsers] = useCountUp(10, 2000, 0);
  const [bookingsCount, startBookings] = useCountUp(500, 2000, 0);
  const [ratingCount, startRating] = useCountUp(4.9, 2000, 0);

  // Navigation scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 50);
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Trigger count-up when stats section is visible
  useEffect(() => {
    if (aboutVisible && !statsVisible) {
      setStatsVisible(true);
      setTimeout(() => {
        startUsers();
        startBookings();
        startRating();
      }, 300);
    }
  }, [aboutVisible, statsVisible, startUsers, startBookings, startRating]);

  // Stagger animation for feature cards
  const [featureCardsVisible, setFeatureCardsVisible] = useState(false);
  useEffect(() => {
    if (featuresVisible && !featureCardsVisible) {
      setFeatureCardsVisible(true);
    }
  }, [featuresVisible, featureCardsVisible]);
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 backdrop-blur-xl transition-all duration-300 ${navScrolled ? 'shadow-lg' : ''}`}>
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-display font-bold">Bookly</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <a 
              href="#about" 
              className="text-muted-foreground hover:text-foreground transition-all duration-300 relative group py-2"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#features" 
              className="text-muted-foreground hover:text-foreground transition-all duration-300 relative group py-2"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#services" 
              className="text-muted-foreground hover:text-foreground transition-all duration-300 relative group py-2"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Services
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#how-it-works" 
              className="text-muted-foreground hover:text-foreground transition-all duration-300 relative group py-2"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              How it Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#pricing" 
              className="text-muted-foreground hover:text-foreground transition-all duration-300 relative group py-2"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#contact" 
              className="text-muted-foreground hover:text-foreground transition-all duration-300 relative group py-2"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            <Button asChild className="glow text-sm sm:text-base px-4">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center mb-6">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-display font-bold">Bookly</span>
                  </Link>
                </div>

                <nav className="flex-1 space-y-1">
                  <a
                    href="#about"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    About
                  </a>
                  <a
                    href="#features"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Features
                  </a>
                  <a
                    href="#services"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Services
                  </a>
                  <a
                    href="#how-it-works"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    How it Works
                  </a>
                  <a
                    href="#pricing"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Pricing
                  </a>
                  <a
                    href="#contact"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Contact
                  </a>
                </nav>

                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between px-4">
                    <span className="text-sm font-medium">Theme</span>
                    <ThemeToggle />
                  </div>
                  <div className="px-4">
                    <Button className="w-full glow" asChild>
                      <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>Get started</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 relative overflow-hidden w-full">
        {/* Background effects with floating animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] float pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px] float-reverse float-delay-1" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary/10 rounded-full blur-[80px] float float-delay-2" />
        </div>
        
        <div className="w-full max-w-6xl mx-auto relative">
          <div className={`text-center space-y-8 transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm transition-all duration-700 delay-100 ${heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-muted-foreground">Appointment scheduling made simple</span>
            </div>
            
            <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold tracking-tight transition-all duration-1000 delay-200 px-2 sm:px-0 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              Book smarter.
              <br />
              <span className="gradient-text animate-pulse-glow">Grow faster.</span>
            </h1>
            
            <p className={`text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2 sm:px-4 transition-all duration-1000 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              The all-in-one booking platform that helps service businesses manage appointments, 
              clients, and staff — all from one beautiful dashboard.
            </p>
            
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 transition-all duration-1000 delay-400 w-full sm:w-auto ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <Button size="lg" className="glow text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto hover:scale-105 transition-transform duration-300" asChild>
                <Link to="/auth">
                  Start for Free
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto hover:scale-105 transition-transform duration-300" asChild>
                <a href="#features">See Features</a>
              </Button>
            </div>
            
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-8 text-sm text-muted-foreground transition-all duration-1000 delay-500 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success animate-pulse" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success animate-pulse" />
                <span>No credit card required</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success animate-pulse" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
          
          {/* Dashboard Preview - Hidden on small mobile */}
          <div className={`mt-12 sm:mt-16 relative hidden sm:block transition-all duration-1000 delay-600 ${heroVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
            <div className="glass-card p-2 rounded-2xl glow hover:scale-[1.02] transition-transform duration-500">
              <div className="bg-card rounded-xl overflow-hidden border border-border/50">
                {/* Browser header */}
                <div className="p-4 border-b border-border/50 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                  <div className="ml-4 flex-1 h-6 bg-muted/30 rounded-full max-w-xs" />
                </div>
                
                {/* Dashboard content */}
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-foreground">Dashboard</h3>
                      <p className="text-sm text-muted-foreground">Welcome back, Sarah</p>
                    </div>
                    <Button size="sm" className="bg-primary text-primary-foreground">
                      + New Booking
                    </Button>
                  </div>
                  
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: "Today's Bookings", value: "12", change: "+2" },
                      { label: "Revenue", value: "$1,240", change: "+18%" },
                      { label: "New Clients", value: "8", change: "+3" },
                      { label: "Completion Rate", value: "94%", change: "+5%" }
                    ].map((stat, i) => (
                      <div 
                        key={i} 
                        className="glass-card p-4 rounded-xl hover:scale-105 transition-all duration-300"
                        style={{ 
                          animation: heroVisible ? `scaleIn 0.5s ease-out ${0.5 + i * 0.1}s both` : 'none'
                        }}
                      >
                        <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <span className="text-xs text-success animate-pulse">{stat.change}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Charts area */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Revenue chart placeholder */}
                    <div className="md:col-span-2 glass-card p-4 rounded-xl">
                      <p className="text-sm font-medium text-foreground mb-4">Revenue Overview</p>
                      <div className="flex items-end gap-2 h-32">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div 
                            key={i} 
                            className="flex-1 bg-primary/20 rounded-t-sm relative overflow-hidden group"
                            style={{ 
                              height: `${h}%`,
                              animation: heroVisible ? `slideUpFade 0.6s ease-out ${i * 0.1}s both` : 'none'
                            }}
                          >
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm group-hover:bg-primary/80 transition-colors"
                              style={{ height: `${h * 0.7}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Upcoming appointments */}
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm font-medium text-foreground mb-3">Upcoming</p>
                      <div className="space-y-3">
                        {[
                          { time: "9:00 AM", name: "Emma Wilson", service: "Haircut" },
                          { time: "10:30 AM", name: "John Smith", service: "Massage" },
                          { time: "2:00 PM", name: "Lisa Chen", service: "Facial" }
                        ].map((apt, i) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-3 text-xs hover:bg-primary/5 p-2 rounded transition-all duration-300"
                            style={{ 
                              animation: heroVisible ? `slideUpFade 0.5s ease-out ${0.7 + i * 0.1}s both` : 'none'
                            }}
                          >
                            <span className="text-primary font-medium w-16">{apt.time}</span>
                            <div className="flex-1 truncate">
                              <p className="text-foreground truncate">{apt.name}</p>
                              <p className="text-muted-foreground">{apt.service}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className={`text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 md:mb-16 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold px-2">
              Everything you need to <span className="gradient-text">scale</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2 sm:px-4">
              Powerful features designed for service businesses of all sizes
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Calendar,
                title: "Smart Scheduling",
                description: "Drag-and-drop calendar with real-time availability and conflict detection"
              },
              {
                icon: Users,
                title: "Client Management",
                description: "Keep track of client history, preferences, and spending patterns"
              },
              {
                icon: Clock,
                title: "Automated Reminders",
                description: "Reduce no-shows with SMS and email reminders"
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Track revenue, appointments, and staff performance"
              },
              {
                icon: Shield,
                title: "Secure Payments",
                description: "Accept deposits and payments online with Stripe integration"
              },
              {
                icon: Zap,
                title: "Staff Management",
                description: "Assign services, set schedules, and track commissions"
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`glass-card p-6 rounded-xl hover-lift group transition-all duration-500 ${featureCardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] float pulse-glow" />
        </div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center space-y-4 mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold">
              Get started in <span className="gradient-text">minutes</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Set up your booking system in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create your business",
                description: "Sign up and add your business details, services, and pricing"
              },
              {
                step: "02",
                title: "Add your team",
                description: "Invite staff members and assign them to services"
              },
              {
                step: "03",
                title: "Share your booking page",
                description: "Get a custom booking link to share with clients"
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className="text-center space-y-4 group hover:scale-105 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl font-display font-bold gradient-text">{item.step}</span>
                </div>
                <h3 className="text-xl font-display font-semibold group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className={`text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 md:mb-16 transition-all duration-700 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold px-2">
              Simple, transparent <span className="gradient-text">pricing</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              Start free, upgrade when you're ready
            </p>
          </div>
          
          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : subscriptionPlans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No pricing plans available</p>
            </div>
          ) : (
            <div className={`grid gap-4 sm:gap-6 md:gap-8 ${subscriptionPlans.length === 1 ? 'md:grid-cols-1 max-w-lg mx-auto' : subscriptionPlans.length === 2 ? 'md:grid-cols-2 lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
              {subscriptionPlans.map((plan, index) => {
                const currency = getCurrencyByCode(plan.currency);
                const delay = index * 100;
                return (
                  <div
                    key={plan.id}
                    className={`glass-card p-6 sm:p-8 md:p-10 rounded-2xl ${plan.is_popular ? 'gradient-border relative glow' : ''} hover-lift transition-all duration-500 ${pricingVisible ? 'opacity-100 translate-x-0' : index % 2 === 0 ? 'opacity-0 -translate-x-10' : 'opacity-0 translate-x-10'}`}
                    style={{ transitionDelay: `${delay}ms` }}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-xl sm:text-2xl font-display font-bold">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-display font-bold">
                          {currency.symbol}{plan.price}
                        </span>
                        <span className="text-sm sm:text-base text-muted-foreground">
                          /{plan.billing_period === 'month' ? 'month' : 'year'}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-muted-foreground">{plan.description}</p>
                      )}
                    </div>
                    
                    <ul className="space-y-3 my-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-success shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      className={`w-full ${plan.is_popular ? 'glow' : ''}`}
                      variant={plan.is_popular ? 'default' : 'outline'}
                      size="lg"
                      asChild
                    >
                      <Link to="/auth">
                        {plan.price === 0 ? 'Get Started Free' : 'Start Free Trial'}
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section ref={aboutRef} id="about" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className={`space-y-6 transition-all duration-700 ${aboutVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
                <Award className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-muted-foreground">Trusted by thousands</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                Built for modern <span className="gradient-text">service businesses</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Bookly is the all-in-one appointment scheduling platform designed to help service businesses 
                manage their operations efficiently. From salons and spas to fitness studios and consulting firms, 
                we provide the tools you need to grow your business.
              </p>
              <p className="text-muted-foreground">
                Our platform combines powerful scheduling features with an intuitive interface, making it easy 
                for both business owners and their clients to manage appointments seamlessly.
              </p>
              <div ref={statsRef} className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 pt-4">
                <div className="transform hover:scale-110 transition-all duration-300 hover:bg-primary/5 p-3 sm:p-4 rounded-lg cursor-default">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-primary">{statsVisible ? `${usersCount}K+` : '0K+'}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="transform hover:scale-110 transition-all duration-300 hover:bg-primary/5 p-3 sm:p-4 rounded-lg cursor-default">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-primary">{statsVisible ? `${bookingsCount}K+` : '0K+'}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Bookings</div>
                </div>
                <div className="transform hover:scale-110 transition-all duration-300 hover:bg-primary/5 p-3 sm:p-4 rounded-lg cursor-default">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-primary">{statsVisible ? ratingCount.toFixed(1) : '0.0'}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Rating</div>
                </div>
              </div>
            </div>
            <div className={`glass-card p-8 rounded-2xl transition-all duration-700 ${aboutVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              <div className="space-y-6">
                {[
                  { icon: TrendingUp, title: "Grow Your Business", desc: "Increase bookings and revenue with automated scheduling" },
                  { icon: Globe, title: "Global Reach", desc: "Available worldwide, supporting multiple languages and currencies" },
                  { icon: Shield, title: "Secure & Reliable", desc: "Enterprise-grade security with 99.9% uptime guarantee" }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-4 group hover:bg-primary/5 p-3 rounded-lg transition-all duration-300 ${aboutVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
                    style={{ transitionDelay: `${i * 150}ms` }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <item.icon className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section ref={servicesRef} id="services" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className={`text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 md:mb-16 transition-all duration-700 ${servicesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold px-2">
              Everything you need to <span className="gradient-text">succeed</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2 sm:px-4">
              Comprehensive tools and features designed for service businesses
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Smartphone,
                title: "Mobile App",
                description: "Manage your business on the go with our mobile-optimized dashboard"
              },
              {
                icon: CreditCard,
                title: "Payment Processing",
                description: "Accept payments online with secure Stripe integration"
              },
              {
                icon: MessageSquare,
                title: "Automated Reminders",
                description: "Reduce no-shows with SMS and email notifications"
              },
              {
                icon: BarChart3,
                title: "Analytics & Reports",
                description: "Track performance with detailed insights and reports"
              },
              {
                icon: Users,
                title: "Team Management",
                description: "Manage staff schedules, commissions, and permissions"
              },
              {
                icon: Calendar,
                title: "Multi-location",
                description: "Manage multiple locations from a single dashboard"
              }
            ].map((service, i) => (
              <div 
                key={i} 
                className={`glass-card p-6 rounded-xl hover-lift group transition-all duration-500 ${servicesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <service.icon className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-primary transition-colors">{service.title}</h3>
                <p className="text-muted-foreground">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className={`text-center space-y-4 mb-10 sm:mb-16 transition-all duration-700 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold">
              Loved by <span className="gradient-text">businesses</span> worldwide
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground">
              See what our customers have to say
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {(reviews.length > 0 ? reviews : [
              { id: '1', name: "Sarah Johnson", role: "Salon Owner", content: "Bookly has transformed how we manage appointments. Our booking rate increased by 40% in just the first month!", rating: 5 },
              { id: '2', name: "Michael Chen", role: "Fitness Studio Manager", content: "The automated reminders have reduced our no-shows significantly. The analytics dashboard is incredibly insightful.", rating: 5 },
              { id: '3', name: "Emily Rodriguez", role: "Consultant", content: "Easy to use, beautiful interface, and excellent customer support. Bookly has become essential to our business.", rating: 5 },
            ]).slice(0, 6).map((testimonial, i) => (
              <div 
                key={testimonial.id || i} 
                className={`glass-card p-6 rounded-xl hover-lift transition-all duration-500 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating || 5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-warning text-warning animate-pulse" style={{ animationDelay: `${j * 100}ms` }} />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role || ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      {blogPosts.length > 0 && (
        <section ref={blogRef} className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/20">
          <div className="container mx-auto max-w-6xl">
            <div className={`text-center space-y-4 mb-10 sm:mb-12 transition-all duration-700 ${blogVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                Latest from our <span className="gradient-text">blog</span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground">
                Tips, updates, and industry insights
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.slice(0, 6).map((post, i) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className={`glass-card p-6 rounded-xl hover-lift transition-all duration-500 overflow-hidden block ${blogVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {post.image_url && (
                    <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                      <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">Blog</span>
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2 line-clamp-2">{post.title}</h3>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
                  )}
                  <span className="text-sm text-primary font-medium inline-flex items-center gap-1">Read more →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-card p-6 sm:p-8 md:p-12 rounded-2xl text-center relative overflow-hidden hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-0 animated-gradient opacity-10" />
            
            <div className="relative space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold animate-pulse-glow">
                Ready to transform your booking experience?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
                Join thousands of businesses already using Bookly to manage their appointments
              </p>
              <Button 
                size="lg" 
                className="glow text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 w-full sm:w-auto hover:scale-105 transition-transform duration-300" 
                asChild
              >
                <Link to="/auth" className="flex items-center justify-center gap-2">
                  Start Your Free Trial
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section ref={contactRef} id="contact" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className={`text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 md:mb-16 transition-all duration-700 ${contactVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold px-2">
              Get in <span className="gradient-text">touch</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              Have questions? We'd love to hear from you
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div className={`space-y-6 transition-all duration-700 ${contactVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <div>
                <h3 className="text-xl font-display font-semibold mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 group hover:bg-primary/5 p-3 rounded-lg transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <Mail className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${siteSettings?.contact_email || 'support@bookly.com'}`} className="text-muted-foreground hover:text-primary transition-colors">
                        {siteSettings?.contact_email || 'support@bookly.com'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group hover:bg-primary/5 p-3 rounded-lg transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <Phone className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                    <div>
                      <p className="font-medium">Phone</p>
                      <a href={`tel:${(siteSettings?.contact_phone || '+1234567890').replace(/\D/g, '')}`} className="text-muted-foreground hover:text-primary transition-colors">
                        {siteSettings?.contact_phone || '+1 (234) 567-890'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group hover:bg-primary/5 p-3 rounded-lg transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <MapPin className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {siteSettings?.contact_address || '123 Business Street, Suite 100, City, State 12345'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`glass-card p-5 sm:p-6 md:p-8 rounded-xl transition-all duration-700 ${contactVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`} style={{ transitionDelay: '200ms' }}>
              <h3 className="text-lg sm:text-xl font-display font-semibold mb-4 sm:mb-6">Send us a message</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Your Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Your message here..."
                  />
                </div>
                <Button className="w-full" size="lg">
                  Send Message
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold">Bookly</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              {footerLinks.length > 0 ? (
                footerLinks.map((link) =>
                  link.url.startsWith('/') ? (
                    <Link key={link.id} to={link.url} className="hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <a key={link.id} href={link.url} className="hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  )
                )
              ) : (
                <>
                  <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
                  <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                  <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                  <a href="#" className="hover:text-foreground transition-colors">Contact</a>
                </>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {siteSettings?.footer_copyright || '© 2024 Bookly. All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>

      {/* Back to top button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Back to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Landing;
