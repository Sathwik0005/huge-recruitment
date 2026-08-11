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
          <span className="text-headline-md font-headline-md font-bold text-secondary-container">
            Huge Requirements
          </span>
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
              <Link href="/" className="text-white/70 hover:text-secondary-container transition-colors duration-200 underline-offset-4 hover:underline">Contact Us</Link>
            </li>
            <li>
              <a href="#" className="text-white/70 hover:text-secondary-container transition-colors duration-200 underline-offset-4 hover:underline">Privacy Policy</a>
            </li>
            <li>
              <a href="#" className="text-white/70 hover:text-secondary-container transition-colors duration-200 underline-offset-4 hover:underline">Terms of service</a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-title-lg font-title-lg text-white">Get in Touch</h4>
          <p className="text-body-md opacity-70">
            Unit 12, Corporate Plaza
            <br />
            Birmingham, B1 2HE
          </p>
          <p className="text-body-md font-bold text-white">+44 (0) 121 555 0123</p>
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
