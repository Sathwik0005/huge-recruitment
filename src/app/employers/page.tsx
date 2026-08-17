import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import EmployerRequestForm from "./EmployerRequestForm";
import PartnershipModelCard from "./PartnershipModelCard";

export const metadata: Metadata = {
  title: "Employer Services | Huge Requirements Limited",
  description:
    "Elite industrial workforce solutions — temporary staffing, permanent placement, and managed services across the UK's industrial sectors.",
};

const WHY_CHOOSE_US = [
  {
    icon: "verified",
    title: "Proven Reliability",
    description:
      "We deliver fully vetted, compliant candidates you can trust to perform safely and efficiently.",
  },
  {
    icon: "factory",
    title: "Industrial Expertise",
    description:
      "Deep sector knowledge allows us to understand your specific technical and cultural requirements.",
  },
  {
    icon: "bolt",
    title: "Rapid Deployment",
    description:
      "Agile recruitment processes ensuring you have the right talent exactly when you need it.",
  },
];

const PARTNERSHIP_MODELS = [
  {
    icon: "schedule",
    title: "Temporary Staffing Solutions",
    description: "Agile workforce deployment for seasonal peaks and short-term needs.",
  },
  {
    icon: "handshake",
    title: "Strategic Permanent Placement",
    description: "Long-term talent acquisition for critical operational roles.",
  },
  {
    icon: "groups",
    title: "High-Volume Deployment",
    description: "Scalable recruitment to mobilize large teams quickly.",
  },
  {
    icon: "domain",
    title: "Multi-Site Managed Services",
    description: "Centralized vendor management across all your facilities.",
  },
  {
    icon: "flash_on",
    title: "Rapid Response Surge Support",
    description: "Immediate workforce injection to handle unexpected demands.",
  },
  {
    icon: "engineering",
    title: "Technical Specialist Sourcing",
    description: "Targeted search for niche engineering and technical skills.",
  },
  {
    icon: "policy",
    title: "Compliance & Audit Management",
    description: "Mitigating risk through rigorous vetting and regulatory adherence.",
  },
  {
    icon: "support_agent",
    title: "On-Site Operational Support",
    description: "Dedicated account managers embedded within your operations.",
  },
  {
    icon: "assignment",
    title: "Project-Based Recruitment",
    description: "End-to-end staffing for specific industrial projects.",
  },
  {
    icon: "military_tech",
    title: "Executive Search for Industry",
    description: "Identifying top-tier leadership for industrial organizations.",
  },
];

const SECTORS = [
  {
    title: "Warehousing",
    image:
      "https://res.cloudinary.com/dgz2omokl/image/upload/v1785158972/istockphoto-1125121546-2048x2048_ja5lnf.jpg",
  },
  {
    title: "Manufacturing",
    image:
      "https://media.istockphoto.com/id/2188581107/photo/worker-in-protective-gear-welding-metal-in-an-industrial-factory-setting-with-sparks-flying.jpg?s=2048x2048&w=is&k=20&c=BqLt67Fsb0H0ThXyNuFjylTrJw3D4hfCqpyYiuSEEBU=",
  },
  {
    title: "Distribution",
    image:
      "https://media.istockphoto.com/id/2091314722/photo/aerial-view-rows-of-trucks-driving-in-harbor-with-trailers.jpg?s=2048x2048&w=is&k=20&c=IJhAgon8QnHs9Hl24q2riGKCt6B3JY-ZhVmg92LXqwk=",
  },
  {
    title: "Automotive",
    image:
      "https://media.istockphoto.com/id/1320950379/photo/3d-render-of-a-car-on-robotic-welding-line.jpg?s=2048x2048&w=is&k=20&c=lk5rIAzBqjs47kCacA9UNJ4-w4cS11UwIG_KL-jEqOs=",
  },
  {
    title: "Production",
    image:
      "https://media.istockphoto.com/id/1204069369/photo/group-of-students-in-an-engineering-class-looking-at-the-teacher.jpg?s=2048x2048&w=is&k=20&c=32sby6950eelHjZ1yjICb4_h9k8X227r7Cs8vwFR8xs=",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Initial Consultation",
    description: "We understand your unique operational culture and technical needs.",
  },
  {
    number: 2,
    title: "Rapid Selection",
    description: "Leveraging our proprietary database of high-calibre industrial talent.",
  },
  {
    number: 3,
    title: "Placement & Support",
    description: "Seamless onboarding and ongoing support to ensure long-term success.",
  },
];

export default function EmployersPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-140 flex items-center overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="https://res.cloudinary.com/uhfrtle0/image/upload/v1786589991/employers.png"
          className="absolute inset-0 w-full h-full object-cover  brightness-125"
        >
          <source
            src="https://res.cloudinary.com/uhfrtle0/video/upload/v1786592035/employers_video.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 employer-hero-gradient opacity-85" />
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full">
          <Reveal className="max-w-2xl space-y-6">
            <span className="inline-block bg-employer-accent text-employer-on-accent px-3 py-1 text-label-md font-label-md uppercase tracking-widest rounded">
              Employer Solutions
            </span>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-white leading-tight">
              Precision Staffing for Industrial Excellence.
            </h1>
            <p className="font-body-lg text-body-lg text-white/80 max-w-lg">
              We deliver elite workforce solutions tailored for the UK&apos;s most demanding industrial
              sectors. From temporary surge support to high-impact permanent placements.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="#request-talent"
                className="bg-employer-accent text-employer-on-accent px-8 py-4 rounded text-body-lg font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2 w-fit"
              >
                Request Talent
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-xxl bg-surface-container-lowest">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <Reveal className="mb-12 text-center max-w-2xl mx-auto">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4">
              Why Choose Huge Requirements Limited
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Unmatched reliability and industrial expertise driving operational excellence.
            </p>
          </Reveal>
          <Reveal className="grid grid-cols-1 md:grid-cols-3 rounded-2xl border border-outline-variant divide-y md:divide-y-0 md:divide-x divide-outline-variant overflow-hidden bg-surface">
            {WHY_CHOOSE_US.map((item, index) => (
              <div
                key={item.title}
                className="group relative p-10 hover:bg-primary/4 transition-colors duration-300"
              >
                <span className="absolute top-6 right-8 font-display-lg text-6xl font-black text-primary/5 group-hover:text-primary/10 transition-colors duration-300 select-none">
                  0{index + 1}
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined text-[32px] text-primary mb-6 block">
                    {item.icon}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{item.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{item.description}</p>
                  <div className="mt-6 h-0.5 w-8 bg-primary group-hover:w-16 transition-all duration-300" />
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Partnership Models */}
      <section className="py-xxl bg-surface">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <Reveal className="mb-12 text-center max-w-2xl mx-auto">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4">
              Our Partnership Models
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Bespoke workforce solutions aligned with your strategic objectives.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {PARTNERSHIP_MODELS.map((model, index) => (
              <Reveal key={model.title} delay={(index % 5) * 80} className="h-full">
                <PartnershipModelCard icon={model.icon} title={model.title} description={model.description} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Our Sectors */}
      <section className="py-xxl bg-surface-container-lowest">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <Reveal className="mb-12 text-center max-w-2xl mx-auto">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Our Sectors</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Specialized talent delivery across key industrial domains.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {SECTORS.map((sector, index) => (
              <Reveal
                key={sector.title}
                delay={index * 100}
                className="relative h-62.5 rounded-lg overflow-hidden group"
              >
                <img
                  src={sector.image}
                  alt={sector.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-linear-to-t from-inverse-surface/90 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <h4 className="font-headline-md text-headline-md text-white">{sector.title}</h4>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Talent Request Form */}
      <section className="py-xxl bg-surface-container-low scroll-mt-20" id="request-talent">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <Reveal>
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4">
                Find Your Next Elite Hire.
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">
                Tell us your requirements, and our sector-specialists will provide a curated shortlist of
                pre-vetted candidates within 48 hours.
              </p>
              <div className="space-y-6">
                {STEPS.map((step) => (
                  <div key={step.number} className="flex gap-4 items-center">
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-primary text-on-primary font-bold">
                      {step.number}
                    </div>
                    <div>
                      <h4 className="font-headline-md text-headline-md text-primary">{step.title}</h4>
                      <p className="text-on-surface-variant">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={150}>
              <EmployerRequestForm />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
