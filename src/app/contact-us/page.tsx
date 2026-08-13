import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | Huge Requirements Limited",
  description:
    "Get in touch with Huge Requirements Limited — whether you're a candidate looking for your next role or an employer seeking top-tier industrial talent.",
};

const OFFICE_ADDRESS = "543, 1 Concourse Way, Sheffield City Centre, Acero, Sheffield S1 2BJ";
const MAPS_QUERY = encodeURIComponent(OFFICE_ADDRESS);
const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`;
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`;

export default function ContactUsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0 employer-hero-gradient opacity-90" />
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-employer-accent/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-24 md:py-28 text-center">
          <Reveal className="max-w-2xl mx-auto space-y-6">
            <span className="inline-block bg-employer-accent text-employer-on-accent px-3 py-1 text-label-md font-label-md uppercase tracking-widest rounded">
              Get in Touch
            </span>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-white leading-tight">
              We&apos;d Love to Hear From You
            </h1>
            <p className="font-body-lg text-body-lg text-white/80 max-w-xl mx-auto">
              Whether you&apos;re a candidate seeking your next big opportunity or an employer looking
              for top-tier talent, our dedicated team is ready to support your requirements.
            </p>
          </Reveal>
        </div>
      </section>


      {/* Form and Details Layout */}
      <section className="py-xxl bg-surface-container-lowest">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid lg:grid-cols-12 gap-gutter">
            {/* Contact Form */}
            <Reveal className="lg:col-span-7 h-full">
              <div className="h-full bg-surface-container-low border border-outline-variant rounded-2xl p-8 md:p-10">
                <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Send Us a Message</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-8">
                  Fill out the form below and a member of our team will get back to you shortly.
                </p>
                <ContactForm />
              </div>
            </Reveal>

            {/* Office Details & Map */}
            <Reveal delay={100} className="lg:col-span-5 h-full">
              <div className="h-full flex flex-col gap-6">
                <div className="bg-primary text-on-primary rounded-2xl p-8 md:p-10">
                  <h3 className="font-headline-md text-headline-md mb-6">Corporate Office</h3>
                  <div className="flex items-start gap-4 mb-6">
                    <span className="material-symbols-outlined text-employer-accent mt-1">
                      location_on
                    </span>
                    <div className="font-body-md text-body-md text-white/85 space-y-0.5">
                      <p className="font-semibold text-white">Huge Requirements Limited</p>
                      <p>543, 1 Concourse Way</p>
                      <p>Sheffield City Centre, Acero</p>
                      <p>Sheffield S1 2BJ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-employer-accent">mail</span>
                    <a
                      href="mailto:info@hugerequirements.co.uk"
                      className="font-body-md text-body-md text-white/85 hover:text-white break-all"
                    >
                      info@hugerequirements.co.uk
                    </a>
                  </div>
                </div>

                <div className="relative flex-1 min-h-80 rounded-2xl overflow-hidden border border-outline-variant shadow-[0_4px_16px_rgba(2,36,72,0.06)]">
                  <iframe
                    title="Map showing Huge Requirements Limited office location"
                    src={MAPS_EMBED_URL}
                    className="absolute inset-0 w-full h-full grayscale-[0.15] contrast-[1.05]"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <a
                    href={MAPS_DIRECTIONS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 left-4 right-4 sm:right-auto bg-surface-container-lowest text-primary font-label-md text-label-md font-bold px-5 py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 hover:bg-secondary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">directions</span>
                    Visit Our Office
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
