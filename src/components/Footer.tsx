import Link from "next/link";

const SECTOR_LINKS = [
  "Production",
  "Warehousing",
  "Manufacturing",
  "Distribution",
  "Automotive",
];

export default function Footer() {
  return (
    <footer className="bg-primary text-white w-full">
      <div className="w-full py-stack-lg px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-container-max mx-auto">
        <div className="space-y-4">
          <img
            src="https://res.cloudinary.com/uhfrtle0/image/upload/v1786575206/company_logo_new.png"
            alt="Huge Requirements Limited"
            className="h-20 w-auto object-contain"
          />
          <p className="text-body-md opacity-70">
            The premier recruitment partner for UK industrial sectors,
            delivering excellence since 2026.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-title-lg font-title-lg text-white">Our Sectors</h4>
          <ul className="space-y-2">
            {SECTOR_LINKS.map((sector) => (
              <li key={sector}>
                <Link
                  href="/sectors"
                  className="text-white/70 hover:text-secondary-container transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  {sector}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-title-lg font-title-lg text-white">Company</h4>
          <ul className="space-y-2">
            <li>
              <Link href="/contact-us" className="text-white/70 hover:text-secondary-container transition-colors duration-200 underline-offset-4 hover:underline">Contact Us</Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="text-white/70 hover:text-secondary-container transition-colors duration-200 underline-offset-4 hover:underline">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="text-white/70 hover:text-secondary-container transition-colors duration-200 underline-offset-4 hover:underline">Terms of service</Link>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-title-lg font-title-lg text-white">Get in Touch</h4>
          <p className="text-body-md opacity-70">
            543, 1 Concourse Way
            <br />
            Sheffield City Centre, Acero
            <br />
            Sheffield S1 2BJ
          </p>
          <p className="text-body-md opacity-70">info@hugerequirements.co.uk</p>
        </div>
      </div>

      <div className="border-t border-white/10 py-4">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <span className="text-label-caps font-label-caps uppercase opacity-50">
            ©
            Copyright 2026. All Rights Reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
