export default function PrivacyPolicyPage() {
  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-gutter py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-headline-lg text-primary mb-2">Privacy Policy</h1>
        <p className="text-label-md text-on-surface-variant mb-10">Last updated: August 10, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-headline-md text-on-surface mb-3">1. Introduction</h2>
            <p className="text-body-md text-on-surface-variant">
              This Privacy Policy explains how Huge Requirements Limited (&quot;we&quot;, &quot;us&quot;) collects, uses,
              and protects your personal information when you use our recruitment platform.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-body-md text-on-surface-variant">
              <li>
                <span className="font-bold text-on-surface">Account information</span> — your name, email
                address, and password (managed securely via our authentication provider; we never store your
                raw password).
              </li>
              <li>
                <span className="font-bold text-on-surface">Profile and application data</span> — information you
                choose to add to your profile, resumes, and job applications you submit.
              </li>
              <li>
                <span className="font-bold text-on-surface">Usage data</span> — information about how you
                interact with the Service, such as pages visited and actions taken, used to maintain and improve
                the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">3. How We Use Your Information</h2>
            <p className="text-body-md text-on-surface-variant mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 text-body-md text-on-surface-variant">
              <li>Create and manage your account, and verify your identity.</li>
              <li>Match you with relevant job opportunities or candidates.</li>
              <li>Communicate with you about your account, applications, and Service updates.</li>
              <li>Maintain the security and integrity of the Service.</li>
              <li>Comply with our legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">4. How We Share Your Information</h2>
            <p className="text-body-md text-on-surface-variant">
              We do not sell your personal information. We share information only: with employers or candidates
              as necessary to facilitate the recruitment process you initiate, with service providers who help us
              operate the Service (such as our authentication and database providers) under appropriate
              confidentiality obligations, or when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">5. Data Retention</h2>
            <p className="text-body-md text-on-surface-variant">
              We retain your personal information for as long as your account is active or as needed to provide
              you the Service. You may request deletion of your account and associated data at any time, subject
              to any legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">6. Data Security</h2>
            <p className="text-body-md text-on-surface-variant">
              We use industry-standard safeguards, including encrypted authentication and secure session
              handling, to protect your information. No method of transmission or storage is completely secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">7. Your Rights and Choices</h2>
            <p className="text-body-md text-on-surface-variant">
              Depending on your location, you may have the right to access, correct, or delete your personal
              information, or to object to certain processing. You can update most of your account information
              directly, or contact us to make a request.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">8. Children&apos;s Privacy</h2>
            <p className="text-body-md text-on-surface-variant">
              The Service is not directed to individuals under the age of 16, and we do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">9. Changes to This Policy</h2>
            <p className="text-body-md text-on-surface-variant">
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              posting a notice on the Service. Continued use of the Service after changes take effect constitutes
              acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md text-on-surface mb-3">10. Contact Us</h2>
            <p className="text-body-md text-on-surface-variant">
              If you have questions about this Privacy Policy or how we handle your information, please contact
              us through the support channels listed on our website.
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
