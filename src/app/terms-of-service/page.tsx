export default function TermsOfServicePage() {
  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-gutter py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-headline-lg text-primary mb-2">Terms of Service</h1>
        <p className="text-label-md text-on-surface-variant mb-10">Last updated: August 10, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-headline-md text-on-surface mb-3">1. Acceptance of Terms</h2>
            <p className="text-body-md text-on-surface-variant">
              By creating an account or otherwise using Huge Recruitment (&quot;the Service&quot;), you agree to be
              bound by these Terms of Service. If you do not agree to these terms, do not register for or use
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">2. Eligibility and Account Registration</h2>
            <p className="text-body-md text-on-surface-variant">
              You must provide accurate, current, and complete information when creating an account, and keep
              that information up to date. You are responsible for maintaining the confidentiality of your
              account credentials and for all activity that occurs under your account. Notify us immediately if
              you suspect unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">3. Use of the Service</h2>
            <p className="text-body-md text-on-surface-variant mb-3">
              Huge Recruitment provides tools to help job seekers and employers connect. When using the Service,
              you agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-body-md text-on-surface-variant">
              <li>Provide false, misleading, or fraudulent information in your profile or applications.</li>
              <li>Impersonate another person or misrepresent your affiliation with any organization.</li>
              <li>Use the Service to post discriminatory, unlawful, or deceptive job listings or content.</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or to our systems.</li>
              <li>Scrape, harvest, or otherwise collect data from the Service without our written consent.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">4. Account Suspension and Termination</h2>
            <p className="text-body-md text-on-surface-variant">
              We may suspend or terminate your account if we believe, in our reasonable discretion, that you have
              violated these Terms, provided false information, or engaged in conduct that harms other users or
              the Service. You may stop using the Service and request deletion of your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">5. Intellectual Property</h2>
            <p className="text-body-md text-on-surface-variant">
              The Service, including its design, branding, and underlying software, is owned by Huge Recruitment
              and protected by applicable intellectual property laws. Content you submit (such as your profile
              information or resume) remains yours, but you grant us a license to use it as necessary to operate
              and provide the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">6. Disclaimers</h2>
            <p className="text-body-md text-on-surface-variant">
              Huge Recruitment is a platform that facilitates connections between job seekers and employers. We
              do not guarantee employment outcomes, the accuracy of listings posted by third parties, or that the
              Service will be uninterrupted or error-free. The Service is provided &quot;as is&quot; without
              warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">7. Limitation of Liability</h2>
            <p className="text-body-md text-on-surface-variant">
              To the fullest extent permitted by law, Huge Recruitment will not be liable for any indirect,
              incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">8. Changes to These Terms</h2>
            <p className="text-body-md text-on-surface-variant">
              We may update these Terms from time to time. If we make material changes, we will take reasonable
              steps to notify you, such as by posting a notice on the Service. Continued use of the Service after
              changes take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">9. Contact Us</h2>
            <p className="text-body-md text-on-surface-variant">
              If you have questions about these Terms, please contact us through the support channels listed on
              our website.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <a className="text-primary font-bold hover:underline" href="/register">
            Back to registration
          </a>
        </div>
      </div>
    </main>
  );
}
