import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Clock,
  MapPin,
  Package,
  Phone,
  Shield,
  Star,
  Truck,
  Users,
} from "lucide-react";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/50 p-4 shadow-sm">
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function Testimonial({
  name,
  location,
  text,
  rating = 5,
}: {
  name: string;
  location: string;
  text: string;
  rating?: number;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <CardDescription>{location}</CardDescription>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={i < rating ? "h-4 w-4 fill-current" : "h-4 w-4 opacity-30"} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">“{text}”</CardContent>
    </Card>
  );
}

export default function MovingLanding() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const quoteHint = useMemo(() => {
    if (!from && !to) return "Enter locations to get a quick estimate.";
    if (!from || !to) return "Add the other location to refine the estimate.";
    return `Great — moving from ${from} to ${to}.`;
  }, [from, to]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold">MoveSwift</div>
              <div className="text-xs text-muted-foreground">Premium moving, on schedule</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm md:flex">
            <a className="text-muted-foreground hover:text-foreground" href="#services">
              Services
            </a>
            <a className="text-muted-foreground hover:text-foreground" href="#pricing">
              Pricing
            </a>
            <a className="text-muted-foreground hover:text-foreground" href="#faq">
              FAQ
            </a>
            <a className="text-muted-foreground hover:text-foreground" href="#contact">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden md:inline-flex" asChild>
              <a href="#contact">
                <Phone className="mr-2 h-4 w-4" /> Call
              </a>
            </Button>
            <Button asChild>
              <a href="#quote">
                Get a quote <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-32 top-12 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                <BadgeCheck className="mr-1 h-4 w-4" /> Licensed & insured
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                <Shield className="mr-1 h-4 w-4" /> Damage coverage
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                <Clock className="mr-1 h-4 w-4" /> Same-week availability
              </Badge>
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Move without the stress.
              <span className="text-primary"> We handle the heavy lifting.</span>
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              From studio apartments to full villas — MoveSwift packs, protects, and delivers your belongings on time.
              Transparent pricing, professional crews, real-time updates.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" asChild>
                <a href="#quote">
                  Get instant estimate <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#services">
                  See services <Package className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <Stat label="Moves completed" value="3,200+" />
              <Stat label="Avg rating" value="4.9/5" />
              <Stat label="On-time rate" value="98%" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="h-4 w-4 text-emerald-600" /> Background-checked crew
              </span>
              <span className="inline-flex items-center gap-1">
                <Shield className="h-4 w-4 text-emerald-600" /> Furniture protection included
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4 text-emerald-600" /> Weekend slots available
              </span>
            </div>
          </div>

          {/* Quote card */}
          <div id="quote" className="md:pl-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Get a quick quote</CardTitle>
                <CardDescription>Two fields. 30 seconds. No spam.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">From</div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        placeholder="e.g., Dubai Marina"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">To</div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder="e.g., Downtown"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {quoteHint}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button size="lg">Get estimate</Button>
                  <Button size="lg" variant="outline">
                    Book a call
                  </Button>
                </div>

                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <Feature icon={<Users className="h-5 w-5" />} title="Pro crew" desc="Uniformed, trained, careful." />
                  <Feature icon={<Shield className="h-5 w-5" />} title="Protected" desc="Blankets, wrap, straps." />
                  <Feature icon={<Clock className="h-5 w-5" />} title="On schedule" desc="Arrival windows you can trust." />
                  <Feature icon={<Truck className="h-5 w-5" />} title="Modern fleet" desc="Clean, GPS-tracked trucks." />
                </div>
              </CardContent>
            </Card>

            <div className="mt-3 text-xs text-muted-foreground">
              Want to see this inside your app? Visit <span className="font-medium">/moving-demo</span>. Back to your
              main landing at <Link className="underline" to="/">/</Link>.
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything you need for a smooth move</h2>
            <p className="max-w-2xl text-muted-foreground">
              Pick a package, or customize. We can pack, disassemble, protect, move, and reassemble — end to end.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Packing & supplies
                </CardTitle>
                <CardDescription>Boxes, wrap, labeling, fragile handling.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                We use double-walled boxes and protective wrap for glassware, artwork, TVs and furniture.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> Home & office moves
                </CardTitle>
                <CardDescription>Local and inter-city, planned properly.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Dedicated move lead, arrival window, and route planning to avoid delays.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Protection & insurance
                </CardTitle>
                <CardDescription>Coverage options that actually help.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Standard protection included. Upgrade coverage for high-value items.
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">Move day checklist</CardTitle>
                <CardDescription>So nothing slips through the cracks.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>Confirm parking/loading area and building access</span>
                </div>
                <div className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>Separate valuables & documents (carry yourself)</span>
                </div>
                <div className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>Share contact number for driver + move lead</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How it works</CardTitle>
                <CardDescription>Simple process, predictable results.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    1
                  </div>
                  <span>Tell us what you’re moving (rooms/items + addresses)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    2
                  </div>
                  <span>Choose a date/time window and confirm the quote</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    3
                  </div>
                  <span>We pack, move, and set you up at your new place</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">People move with us. Then recommend us.</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Fast isn’t enough — we optimize for care, clarity, and no surprises.
              </p>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> 4.9 average rating
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Testimonial
              name="Sara A."
              location="Dubai Marina"
              text="They wrapped everything properly and arrived exactly in the window they promised. Zero stress."
            />
            <Testimonial
              name="Omar K."
              location="Business Bay"
              text="Office move was smooth — they labeled boxes by room and set up desks faster than expected."
            />
            <Testimonial
              name="Fatima R."
              location="JVC"
              text="Best movers I’ve used. Super careful with my TV and glass table. Would book again."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Simple packages. Transparent add-ons.</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              These are sample prices for the demo landing. Real pricing depends on distance, items, access, and packing.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Studio / 1BR</CardTitle>
                <CardDescription>Great for smaller apartments.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">AED 799</div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> 2 movers + truck
                  </div>
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> Basic wrapping
                  </div>
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> Disassembly (basic)
                  </div>
                </div>
                <Button className="mt-5 w-full" variant="outline" asChild>
                  <a href="#quote">Get estimate</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/40 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">2–3 Bedroom</CardTitle>
                  <Badge className="rounded-full">Most popular</Badge>
                </div>
                <CardDescription>Families & larger apartments.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">AED 1,499</div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> 3–4 movers + truck
                  </div>
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> Full furniture protection
                  </div>
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> Priority scheduling
                  </div>
                </div>
                <Button className="mt-5 w-full" asChild>
                  <a href="#quote">Get estimate</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Villa / Office</CardTitle>
                <CardDescription>Complex moves with coordination.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">Custom</div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> On-site assessment
                  </div>
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> Dedicated move lead
                  </div>
                  <div className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" /> Custom packing plan
                  </div>
                </div>
                <Button className="mt-5 w-full" variant="outline" asChild>
                  <a href="#contact">Talk to us</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">FAQ</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">Clear answers to common questions.</p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="i1">
                <AccordionTrigger>Do you provide boxes and packing materials?</AccordionTrigger>
                <AccordionContent>
                  Yes. We can include boxes, tape, bubble wrap, wardrobe boxes, and fragile packing based on your needs.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="i2">
                <AccordionTrigger>How do you protect furniture?</AccordionTrigger>
                <AccordionContent>
                  Furniture is blanket-wrapped, shrink-wrapped, and secured with straps. Corners and glass are protected
                  separately.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="i3">
                <AccordionTrigger>Can you move on weekends?</AccordionTrigger>
                <AccordionContent>
                  Yes — weekend availability depends on demand. Booking early gives you the best slot options.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="i4">
                <AccordionTrigger>Do you handle disassembly and reassembly?</AccordionTrigger>
                <AccordionContent>
                  We handle basic disassembly/reassembly for beds, tables, and wardrobes. Complex items may require a
                  specialist.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="i5">
                <AccordionTrigger>Are you insured?</AccordionTrigger>
                <AccordionContent>
                  We’re licensed and insured. Standard protection is included, and you can add higher coverage for
                  valuables.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="i6">
                <AccordionTrigger>How fast can you book?</AccordionTrigger>
                <AccordionContent>
                  Often within the same week. For end-of-month peaks, book earlier to lock your preferred time.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section id="contact" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 rounded-3xl border bg-muted/30 p-6 md:grid-cols-2 md:p-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to move?</h2>
              <p className="mt-2 text-muted-foreground">
                Get a quote, pick a slot, and let the crew do the hard part.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="#quote">
                    Get a quote <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline">
                  <Phone className="mr-2 h-4 w-4" /> Call +971 50 000 0000
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Demo page. Replace phone/address with real business info.
              </div>
            </div>

            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-base">Pro tip</CardTitle>
                <CardDescription>Want this style for your brand?</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                I can swap colors, fonts, copy, and sections to match your business (e.g., logistics, cleaning, auto
                repair, clinics). Also easy to convert into a Next.js landing page.
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-8 text-sm text-muted-foreground md:flex-row">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span>© {new Date().getFullYear()} MoveSwift (demo)</span>
            </div>
            <div className="flex items-center gap-4">
              <a className="hover:text-foreground" href="#services">
                Services
              </a>
              <a className="hover:text-foreground" href="#pricing">
                Pricing
              </a>
              <a className="hover:text-foreground" href="#faq">
                FAQ
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
