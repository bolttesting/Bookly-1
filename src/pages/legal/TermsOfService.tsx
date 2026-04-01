import { LegalPageLayout } from "@/components/LegalPageLayout";

const LAST = "March 30, 2026";

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      description="Terms and conditions for using Bookly appointment booking software and bookly.my."
      path="/terms"
      lastUpdated={LAST}
    >
      <p>
        These Terms of Service (“Terms”) govern your access to and use of Bookly’s websites, applications, and related
        services (collectively, the “Services”) offered by Bookly at <a href="https://bookly.my">bookly.my</a>. By
        accessing or using the Services, you agree to these Terms.
      </p>

      <h2 id="eligibility">1. Eligibility and accounts</h2>
      <p>
        You must be able to form a binding contract in your jurisdiction. You are responsible for maintaining the
        confidentiality of your account credentials and for activity under your account. Notify us promptly of
        unauthorized use.
      </p>

      <h2 id="services">2. The Services</h2>
      <p>
        Bookly provides tools for scheduling, client and staff management, notifications, and related business workflows.
        Features may change as we improve the product. We may modify, suspend, or discontinue parts of the Services with
        reasonable notice where practicable.
      </p>

      <h2 id="acceptable-use">3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Services in violation of law or third-party rights;</li>
        <li>Attempt to gain unauthorized access to systems, data, or other users’ accounts;</li>
        <li>Upload malware, overload infrastructure, or interfere with the Services;</li>
        <li>Use the Services to send spam, deceptive messages, or harass others;</li>
        <li>Scrape or harvest data from the Services except as allowed by documented APIs or written permission;</li>
        <li>Misrepresent your identity or affiliation.</li>
      </ul>
      <p>We may suspend or terminate access for violations.</p>

      <h2 id="customer-data">4. Your content and customer data</h2>
      <p>
        You retain ownership of data you submit (“Customer Data”). You grant Bookly a worldwide license to host, process,
        transmit, and display Customer Data solely to provide and improve the Services, comply with law, and as described
        in our Privacy Policy. You represent that you have the rights and, where required, consents to process Customer
        Data.
      </p>

      <h2 id="plans">5. Plans, trials, and fees</h2>
      <p>
        Some features may be free; others may require a paid plan. Fees, billing cycles, and taxes are presented at
        checkout or in your account. Unless stated otherwise, subscriptions renew until canceled. Refunds are handled
        according to the policy shown at purchase or applicable law.
      </p>

      <h2 id="third-parties">6. Third-party services</h2>
      <p>
        Integrations (e.g. payment processors, email providers) are provided by third parties. Your use of those
        services is subject to their terms. Bookly is not responsible for third-party services outside our reasonable
        control.
      </p>

      <h2 id="ip">7. Intellectual property</h2>
      <p>
        Bookly and its licensors own the Services, including software, branding, and documentation. Except for the
        limited rights to use the Services under these Terms, no rights are granted. Feedback you provide may be used
        without obligation to you.
      </p>

      <h2 id="disclaimer">8. Disclaimers</h2>
      <p>
        THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR
        STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM
        EXTENT PERMITTED BY LAW.
      </p>

      <h2 id="liability">9. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, BOOKLY AND ITS AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR GOODWILL. OUR AGGREGATE
        LIABILITY FOR CLAIMS ARISING OUT OF THE SERVICES IN ANY TWELVE-MONTH PERIOD IS LIMITED TO THE GREATER OF (A)
        AMOUNTS YOU PAID BOOKLY FOR THE SERVICES IN THAT PERIOD OR (B) ONE HUNDRED US DOLLARS (USD $100), EXCEPT WHERE
        LIABILITY CANNOT BE LIMITED BY LAW.
      </p>

      <h2 id="indemnity">10. Indemnity</h2>
      <p>
        You will defend and indemnify Bookly against claims arising from your Customer Data, your use of the Services in
        breach of these Terms, or your violation of law or third-party rights, subject to our prompt notice and
        reasonable cooperation.
      </p>

      <h2 id="termination">11. Termination</h2>
      <p>
        You may stop using the Services at any time. We may suspend or terminate access for breach, risk, or legal
        reasons. Provisions that by nature should survive (e.g. liability limits, indemnity) will survive termination.
      </p>

      <h2 id="law">12. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction Bookly designates for your contract (or, if none, the
        laws applicable to the operator of the Services), excluding conflict-of-law rules. Courts in that jurisdiction
        have exclusive venue, except where consumer rights require otherwise.
      </p>

      <h2 id="misc">13. General</h2>
      <p>
        These Terms constitute the entire agreement regarding the Services and supersede prior understandings. If a
        provision is unenforceable, the remainder stays in effect. Failure to enforce a provision is not a waiver.
      </p>

      <h2 id="contact">14. Contact</h2>
      <p>
        For questions about these Terms: <a href="mailto:support@bookly.my">support@bookly.my</a>
      </p>
    </LegalPageLayout>
  );
}
