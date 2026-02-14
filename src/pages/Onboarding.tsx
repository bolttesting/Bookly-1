import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Calendar, Building2, ArrowRight, LogOut } from 'lucide-react';

const businessSchema = z.object({
  name: z.string().trim().min(2, 'Business name must be at least 2 characters').max(100, 'Business name is too long'),
  industry: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
});

const industries = [
  'Hair Salon',
  'Barbershop',
  'Spa & Wellness',
  'Nail Salon',
  'Medical Practice',
  'Dental Clinic',
  'Fitness Studio',
  'Massage Therapy',
  'Photography',
  'Consulting',
  'Other',
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { createBusiness } = useBusiness();
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form states
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = businessSchema.safeParse({
      name,
      industry: industry || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      city: city || undefined,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await createBusiness({
        name,
        industry: industry || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
      });
      toast.success('Business created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create business');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex min-w-0 max-w-full overflow-x-hidden bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center glow">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl sm:text-3xl font-display font-bold gradient-text">Bookly</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
            Let's set up your <br />
            <span className="gradient-text">business</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Tell us about your business so we can customize your experience and get you booking appointments in minutes.
          </p>

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                1
              </div>
              <span className={step >= 1 ? 'text-foreground' : 'text-muted-foreground'}>
                Basic Information
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                2
              </div>
              <span className={step >= 2 ? 'text-foreground' : 'text-muted-foreground'}>
                Contact Details
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center glow">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold gradient-text">Bookly</span>
          </div>

          <Card className="glass-card border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">
                {step === 1 ? 'Tell us about your business' : 'Contact details'}
              </CardTitle>
              <CardDescription>
                {step === 1
                  ? 'This helps us personalize your experience'
                  : 'How can your customers reach you?'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="business-name">Business name *</Label>
                      <Input
                        id="business-name"
                        type="text"
                        placeholder="Acme Salon"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={industry} onValueChange={setIndustry} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((ind) => (
                            <SelectItem key={ind} value={ind}>
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => {
                        if (!name.trim()) {
                          toast.error('Please enter your business name');
                          return;
                        }
                        setStep(2);
                      }}
                      disabled={isLoading}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Business email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="hello@yourbusiness.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="123 Main Street"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="New York"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(1)}
                        disabled={isLoading}
                      >
                        Back
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Business'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Step {step} of 2
          </p>
          
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out & use different account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
