import { Link } from "react-router-dom";
import { Calendar, Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from "lucide-react";
import { TextHoverEffect, FooterBackgroundGradient } from "@/components/ui/hover-footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FooterLink } from "@/hooks/useFooterLinks";
import type { SiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

const EXPLORE_LINKS = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
] as const;

function scrollToHash(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return;
  e.preventDefault();
  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = "text-muted-foreground hover:text-primary transition-colors text-sm";
  if (link.url.startsWith("/")) {
    return (
      <Link to={link.url} className={className}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.url} className={className}>
      {link.label}
    </a>
  );
}

export type LandingHoverFooterProps = {
  footerLinks: FooterLink[];
  siteSettings: SiteSettings | null;
  hasBlog?: boolean;
};

export function LandingHoverFooter({ footerLinks, siteSettings, hasBlog }: LandingHoverFooterProps) {
  const email = siteSettings?.contact_email?.trim();
  const phone = siteSettings?.contact_phone?.trim();
  const address = siteSettings?.contact_address?.trim();
  const copyright =
    siteSettings?.footer_copyright?.trim() ||
    `© ${new Date().getFullYear()} Bookly. All rights reserved.`;

  const accent = "text-primary";

  const exploreList = (
    <ul className="space-y-3 pt-1">
      {EXPLORE_LINKS.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => scrollToHash(e, item.href)}
          >
            {item.label}
          </a>
        </li>
      ))}
      {hasBlog && (
        <li>
          <Link
            to="/blog"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Blog
          </Link>
        </li>
      )}
    </ul>
  );

  const linksList = (
    <ul className="space-y-3 pt-1">
      {footerLinks.length > 0 ? (
        footerLinks.map((link) => (
          <li key={link.id}>
            <FooterLinkItem link={link} />
          </li>
        ))
      ) : (
        <>
          <li>
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Sign in
            </Link>
          </li>
          <li>
            <a
              href="#contact"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => scrollToHash(e, "#contact")}
            >
              Support
            </a>
          </li>
        </>
      )}
    </ul>
  );

  const contactList = (
    <ul className="space-y-4 pt-1">
      {email && (
        <li className="flex items-start gap-3">
          <Mail className={cn("h-[18px] w-[18px] shrink-0 mt-0.5", accent)} aria-hidden />
          <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-primary transition-colors break-all">
            {email}
          </a>
        </li>
      )}
      {phone && (
        <li className="flex items-start gap-3">
          <Phone className={cn("h-[18px] w-[18px] shrink-0 mt-0.5", accent)} aria-hidden />
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {phone}
          </a>
        </li>
      )}
      {address && (
        <li className="flex items-start gap-3">
          <MapPin className={cn("h-[18px] w-[18px] shrink-0 mt-0.5", accent)} aria-hidden />
          <span className="text-sm text-muted-foreground">{address}</span>
        </li>
      )}
      {!email && !phone && !address && (
        <li className="text-sm text-muted-foreground">Contact details can be set in site settings.</li>
      )}
    </ul>
  );

  const legalList = (
    <ul className="space-y-3 pt-1">
      <li>
        <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Privacy Policy
        </Link>
      </li>
      <li>
        <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Terms of Service
        </Link>
      </li>
      <li>
        <Link to="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Cookie Policy
        </Link>
      </li>
    </ul>
  );

  return (
    <footer className="relative h-fit rounded-3xl overflow-hidden mx-4 sm:mx-6 lg:mx-8 mb-6 sm:mb-8 border border-border bg-card/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto p-8 sm:p-12 lg:p-14 z-40 relative">
        {/* Brand — mobile only (desktop uses first grid column) */}
        <div className="flex flex-col space-y-4 pb-4 mb-2 md:hidden">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl sm:text-3xl font-display font-bold text-foreground">Bookly</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            The all-in-one booking platform for service businesses. Manage appointments, clients, and staff from one
            place.
          </p>
        </div>

        {/* Mobile: collapsible menu groups */}
        <Accordion type="multiple" className="md:hidden mb-8">
          <AccordionItem value="explore" className="border-border">
            <AccordionTrigger className="text-foreground text-base font-semibold py-3 hover:no-underline">
              Explore
            </AccordionTrigger>
            <AccordionContent className="pb-4">{exploreList}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="links" className="border-border">
            <AccordionTrigger className="text-foreground text-base font-semibold py-3 hover:no-underline">
              Links
            </AccordionTrigger>
            <AccordionContent className="pb-4">{linksList}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="contact" className="border-border">
            <AccordionTrigger className="text-foreground text-base font-semibold py-3 hover:no-underline">
              Contact
            </AccordionTrigger>
            <AccordionContent className="pb-4">{contactList}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="legal" className="border-border">
            <AccordionTrigger className="text-foreground text-base font-semibold py-3 hover:no-underline">
              Legal
            </AccordionTrigger>
            <AccordionContent className="pb-4">{legalList}</AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Desktop: multi-column grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 lg:gap-12 pb-10">
          {/* Brand column on desktop only (mobile brand is above) */}
          <div className="flex flex-col space-y-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl sm:text-3xl font-display font-bold text-foreground">Bookly</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The all-in-one booking platform for service businesses. Manage appointments, clients, and staff from one
              place.
            </p>
          </div>

          <div>
            <h4 className="text-foreground text-base font-semibold mb-5">Explore</h4>
            {exploreList}
          </div>

          <div>
            <h4 className="text-foreground text-base font-semibold mb-5">Links</h4>
            {linksList}
          </div>

          <div>
            <h4 className="text-foreground text-base font-semibold mb-5">Contact</h4>
            {contactList}
          </div>
        </div>

        <div className="hidden md:flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground pb-6 -mt-2">
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link to="/cookies" className="hover:text-primary transition-colors">
            Cookie Policy
          </Link>
        </div>

        <hr className="border-t border-border my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center md:justify-start gap-5">
            <a href="#" aria-label="Facebook" className="hover:text-primary transition-colors">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Instagram" className="hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" aria-label="LinkedIn" className="hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
          <p className="text-center md:text-right">{copyright}</p>
        </div>
      </div>

      {/* Decorative wordmark — desktop only */}
      <div className="lg:flex hidden h-[24rem] -mt-44 -mb-28 w-full items-center justify-center pointer-events-none">
        <div className="w-full max-w-4xl h-full pointer-events-auto">
          <TextHoverEffect text="Bookly" className="z-50 w-full h-full max-h-[280px]" />
        </div>
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
