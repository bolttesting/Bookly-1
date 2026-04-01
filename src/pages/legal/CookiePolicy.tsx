import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Link } from "react-router-dom";

const LAST = "March 30, 2026";

export default function CookiePolicy() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      description="How Bookly uses cookies and similar technologies on bookly.my and related services."
      path="/cookies"
      lastUpdated={LAST}
    >
      <p>
        This Cookie Policy explains how Bookly (“we”, “us”) uses cookies and similar technologies when you use{" "}
        <a href="https://bookly.my">bookly.my</a> and our web applications. It should be read together with our{" "}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2 id="what">1. What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device. We also use similar technologies such as local storage and
        pixels where they serve a comparable purpose.
      </p>

      <h2 id="why">2. Why we use them</h2>
      <p>We use cookies and similar technologies to:</p>
      <ul>
        <li>Keep you signed in and maintain session security;</li>
        <li>Remember preferences (e.g. theme: light or dark mode);</li>
        <li>Protect against fraud and abuse;</li>
        <li>Understand how the Services are used so we can improve performance and reliability;</li>
        <li>Measure effectiveness of our own marketing where applicable.</li>
      </ul>

      <h2 id="types">3. Types of cookies</h2>
      <p>
        <strong>Strictly necessary.</strong> Required for core functionality such as authentication, load balancing, and
        security. These may not be optional if you wish to use the Services.
      </p>
      <p>
        <strong>Functional.</strong> Remember settings you choose (e.g. display preferences) to improve your experience.
      </p>
      <p>
        <strong>Analytics.</strong> Help us understand aggregate usage patterns (e.g. which pages load slowly). We aim
        to configure analytics in a privacy-conscious way.
      </p>
      <p>
        <strong>Marketing (if any).</strong> Used only if we run campaigns that rely on cookies; where required, we will
        ask for consent before setting non-essential marketing cookies.
      </p>

      <h2 id="third">4. Third parties</h2>
      <p>
        Our hosting, authentication, email, and analytics providers may set their own cookies when their scripts load.
        Their use is governed by their respective policies. We review subprocessors as part of our security and privacy
        practices.
      </p>

      <h2 id="manage">5. Managing cookies</h2>
      <p>
        You can control cookies through your browser settings (block, delete, or alert). Blocking strictly necessary
        cookies may prevent sign-in or other features from working. You can often clear site data for bookly.my from
        browser privacy settings.
      </p>

      <h2 id="changes">6. Updates</h2>
      <p>
        We may update this Cookie Policy when our practices change. The “Last updated” date at the top will reflect the
        latest revision.
      </p>

      <h2 id="contact">7. Contact</h2>
      <p>
        Questions: <a href="mailto:support@bookly.my">support@bookly.my</a>
      </p>
    </LegalPageLayout>
  );
}
