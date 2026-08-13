"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_LINKS = [
  { href: "/jobs", label: "Find Jobs" },
  { href: "/employers", label: "For Employers" },
  { href: "/sectors", label: "Our Sectors" },
  { href: "/contact-us", label: "Contact Us" },
];

interface HeaderClientProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function HeaderClient({ isLoggedIn, isAdmin }: HeaderClientProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  const navLinks = isAdmin ? [...NAV_LINKS, { href: "/admin", label: "Admin Portal" }] : NAV_LINKS;

  return (
    <header className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant h-20">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-full max-w-container-max mx-auto">
        <Link href="/" className="flex items-center h-20 shrink-0">
          {/*
            Placeholder logo slot — drop the real logo file into
            public/logos/ (e.g. public/logos/site-logo.png) and update
            src below to "/logos/site-logo.png", or point src at a
            hosted URL directly.
          */}
          <img
            src="https://res.cloudinary.com/uhfrtle0/image/upload/v1786575206/company_logo_new.png"
            alt="Huge Requirements Limited"
            className="h-full w-auto object-contain"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "font-body-md text-body-md text-primary font-bold border-b-2 border-primary pb-1 transition-colors"
                    : "font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <LogoutButton />
          ) : (
            <>
              <Link
                href="/login"
                className="font-body-md text-body-md text-primary hover:bg-surface-container-low px-4 py-2 rounded-lg transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="font-body-md text-body-md bg-primary text-on-primary px-6 py-2 rounded-lg hover:opacity-90 transition-all duration-200"
              >
                Register
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="md:hidden flex items-center justify-center w-10 h-10 text-on-surface"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="material-symbols-outlined text-3xl">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-surface border-b border-outline-variant shadow-lg">
          <nav className="flex flex-col px-margin-mobile py-2">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={
                    active
                      ? "font-body-md text-body-md text-primary font-bold py-3 border-b border-outline-variant"
                      : "font-body-md text-body-md text-on-surface-variant hover:text-primary py-3 border-b border-outline-variant transition-colors"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="flex flex-col gap-2 py-3">
              {isLoggedIn ? (
                <LogoutButton />
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="font-body-md text-body-md text-primary text-center px-4 py-3 rounded-lg border border-primary transition-all duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="font-body-md text-body-md bg-primary text-on-primary text-center px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
