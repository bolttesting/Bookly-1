import { LegalPageLayout } from "@/components/LegalPageLayout";

const LAST = "March 30, 2026";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="How Bookly collects, uses, and protects personal data when you use our appointment booking platform at bookly.my."
      path="/privacy"
      lastUpdated={LAST}
    >
      <p>
        Bookly (“Bookly”, “we”, “us”, or “our”) provides online appointment scheduling and business management
        software. This Privacy Policy explains how we handle personal information when you visit{" "}
        <a href="https://bookly.my">bookly.my</a> or use our services (the “Services”).
      </p>

      <h2 id="collect">1. Information we collect</h2>
      <p>We may collect the following categories of information:</p>
      <ul>
        <li>
          <strong>Account and profile data:</strong> name, email address, phone number, password (stored securely via
          our authentication provider), business name, and settings you choose to save in the product.
        </li>
        <li>
          <strong>Booking and operational data:</strong> appointments, services, staff assignments, customer contact
          details you add as a business user, messages sent through the platform, and related metadata (timestamps,
          status).
        </li>
        <li>
          <strong>Technical and usage data:</strong> IP address, device type, browser, approximate location derived
          from IP, pages viewed, diagnostics, and cookies or similar technologies as described in our Cookie Policy.
        </li>
        <li>
          <strong>Payment-related data:</strong> when you connect payment providers (e.g. Stripe), we may process
          limited billing identifiers as required to operate those integrations. Card numbers are handled by the
          payment processor, not stored by us as full card data.
        </li>
        <li>
          <strong>Support communications:</strong> information you send when you contact support or respond to surveys.
        </li>
      </ul>

      <h2 id="use">2. How we use information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Provide, maintain, and improve the Services;</li>
        <li>Create and manage accounts, authenticate users, and enforce security;</li>
        <li>Send transactional emails and in-product notifications (e.g. booking confirmations, reminders);</li>
        <li>Analyze usage in aggregate to improve performance and user experience;</li>
        <li>Comply with law, respond to lawful requests, and protect rights and safety;</li>
        <li>
          Market our own products where permitted and with appropriate consent where required (you can opt out of
          marketing emails using the unsubscribe link).
        </li>
      </ul>

      <h2 id="legal-bases">3. Legal bases (where applicable)</h2>
      <p>
        If you are in the European Economic Area, the UK, or similar jurisdictions, we rely on one or more of:
        performance of a contract, legitimate interests (e.g. securing the service, analytics that do not override your
        rights), consent (e.g. non-essential cookies or certain marketing), and legal obligation.
      </p>

      <h2 id="sharing">4. How we share information</h2>
      <p>We may share information with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> who host infrastructure, send email/SMS, process analytics, or provide
          customer support tools, bound by confidentiality and data-processing terms;
        </li>
        <li>
          <strong>Integrations you enable</strong> (e.g. payment, calendar, or marketing tools) according to your
          configuration;
        </li>
        <li>
          <strong>Professional advisers</strong> where required (lawyers, auditors) under confidentiality;
        </li>
        <li>
          <strong>Authorities</strong> when required by law or to protect Bookly, users, or the public.
        </li>
      </ul>
      <p>We do not sell your personal information as a commodity. We do not share data for third-party advertising.</p>

      <h2 id="retention">5. Retention</h2>
      <p>
        We keep information for as long as your account is active and as needed to provide the Services, comply with
        legal obligations, resolve disputes, and enforce agreements. Backup copies may persist for a limited period
        after deletion.
      </p>

      <h2 id="security">6. Security</h2>
      <p>
        We implement administrative, technical, and organizational measures designed to protect personal information.
        No method of transmission over the Internet is 100% secure; we encourage strong passwords and safeguarding
        credentials.
      </p>

      <h2 id="rights">7. Your rights and choices</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access, correct, or delete certain personal data;</li>
        <li>Object to or restrict certain processing;</li>
        <li>Data portability where technically feasible;</li>
        <li>Withdraw consent where processing is consent-based;</li>
        <li>Lodge a complaint with a supervisory authority.</li>
      </ul>
      <p>
        To exercise rights, contact us using the details below. Business users are responsible for honoring their own
        customers’ privacy rights under applicable law.
      </p>

      <h2 id="children">8. Children</h2>
      <p>
        The Services are not directed to children under 16 (or the age required in your jurisdiction). We do not
        knowingly collect personal information from children. If you believe we have, please contact us to remove it.
      </p>

      <h2 id="international">9. International transfers</h2>
      <p>
        We may process data in countries other than your own. Where required, we use appropriate safeguards such as
        standard contractual clauses or equivalent mechanisms.
      </p>

      <h2 id="changes">10. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the updated version on this page and revise the
        “Last updated” date. Material changes may be communicated by email or in-product notice where appropriate.
      </p>

      <h2 id="contact">11. Contact</h2>
      <p>
        Questions about this Privacy Policy:{" "}
        <a href="mailto:support@bookly.my">support@bookly.my</a>
      </p>
    </LegalPageLayout>
  );
}
