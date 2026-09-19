import type { NextConfig } from "next";

// Firebase Auth (client SDK) needs to talk to Google's identity endpoints and
// load a hidden iframe from the project's auth domain for popup sign-in —
// these are the same NEXT_PUBLIC_FIREBASE_* values already shipped in the
// client bundle, not secrets. @vercel/blob's client-side `upload()` (guest CV
// upload) sends the actual PUT through Vercel's own API host
// (https://vercel.com/api/blob — see node_modules/@vercel/blob's
// `defaultVercelBlobApiUrl`), not the `*.blob.vercel-storage.com` read/storage
// domain, so that's the host that must be allowed here.
// Google sign-in (`signInWithPopup` + `GoogleAuthProvider`, see
// src/hooks/useGoogleSignIn.ts) additionally loads Google's GApi popup/iframe
// relay: a `<script>` from https://apis.google.com/js/api.js and a hidden
// iframe served from https://apis.google.com used for postMessage relay
// between the popup and the opener. Without apis.google.com in both
// script-src and frame-src, the browser blocks that script/iframe and the
// popup flow fails client-side before Firebase ever gets a credential.
// Next's dev-mode bundler (Turbopack/Fast Refresh) relies on eval() for
// on-the-fly source maps and hot-reload — blocking it under CSP breaks
// hydration entirely in `next dev` (React logs a fatal "eval() is not
// supported" console error and the page never finishes rendering). Production
// builds never call eval(), so 'unsafe-eval' is scoped to development only.
const SCRIPT_SRC = `'self' 'unsafe-inline' https://apis.google.com${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`;

const CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src ${SCRIPT_SRC}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // blob: is needed for the candidate registration avatar upload's local
  // preview (URL.createObjectURL on the just-picked file, before the S3
  // upload round-trip returns a real signed URL) — see AvatarUpload.tsx.
  "img-src 'self' data: blob: https://res.cloudinary.com https://media.istockphoto.com https://thumbs.dreamstime.com",
  "media-src 'self' https://res.cloudinary.com",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://huge-recruitment.firebaseapp.com https://vercel.com https://*.public.blob.vercel-storage.com",
  "frame-src 'self' https://huge-recruitment.firebaseapp.com https://accounts.google.com https://www.google.com https://apis.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // No `preload` — that requires HSTS preload-list submission, which is a
  // one-way, hard-to-reverse DNS-level commitment outside this codebase.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["firebase-admin", "jwks-rsa", "jose"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "media.istockphoto.com" },
      { protocol: "https", hostname: "thumbs.dreamstime.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.hugerecruitment.co.uk" }],
        destination: "https://hugerecruitment.co.uk/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
