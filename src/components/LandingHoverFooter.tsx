import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
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
    <footer className="relative h-fit rounded-3xl overflow-hidden mx-2 sm:mx-4 lg:mx-6 mb-6 sm:mb-8 border border-border bg-card/40 backdrop-blur-sm">
      <div className="w-full max-w-[min(100%,92rem)] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 py-8 sm:py-12 lg:py-14 z-40 relative">
        {/* Brand — mobile only (desktop uses first grid column) */}
        <div className="flex flex-col space-y-4 pb-4 mb-2 md:hidden">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <AppLogo
              iconClassName="h-10 w-10"
              wordmarkClassName="text-2xl sm:text-3xl text-foreground"
            />
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
          <AccordionItem value="legal" className="border-border">
            <AccordionTrigger className="text-foreground text-base font-semibold py-3 hover:no-underline">
              Privacy &amp; legal
            </AccordionTrigger>
            <AccordionContent className="pb-4">{legalList}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="contact" className="border-border">
            <AccordionTrigger className="text-foreground text-base font-semibold py-3 hover:no-underline">
              Contact
            </AccordionTrigger>
            <AccordionContent className="pb-4">{contactList}</AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Desktop / tablet: brand + menus including Privacy & legal */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-10 md:gap-x-12 md:gap-y-10 lg:gap-12 pb-6 lg:pb-10">
          <div className="flex flex-col space-y-4 md:col-span-2 lg:col-span-1 lg:max-w-sm">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <AppLogo
                iconClassName="h-10 w-10"
                wordmarkClassName="text-2xl sm:text-3xl text-foreground"
              />
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
            <h4 className="text-foreground text-base font-semibold mb-5">Privacy &amp; legal</h4>
            {legalList}
          </div>

          <div>
            <h4 className="text-foreground text-base font-semibold mb-5">Contact</h4>
            {contactList}
          </div>
        </div>

        <hr className="border-t border-border/80 mt-2 md:mt-0" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 text-sm text-muted-foreground pt-8 pb-6 md:pb-8">
          <div className="flex flex-wrap justify-center sm:justify-start gap-5">
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
          <p className="text-center sm:text-right max-w-xl sm:max-w-none">{copyright}</p>
        </div>
      </div>

      {/* Large wordmark — below socials + copyright */}
      <div className="hidden md:flex w-full items-center justify-center pointer-events-none px-4 min-h-[12rem] lg:min-h-[16rem] py-4 lg:py-8 pb-8 lg:pb-10">
        <div className="w-full max-w-6xl xl:max-w-7xl h-[200px] lg:h-[280px] pointer-events-auto">
          <TextHoverEffect text="Bookly" className="z-10 w-full h-full max-h-[280px]" />
        </div>
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
