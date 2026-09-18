import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — DocBrief",
  description: "How DocBrief (a WedgeWerks™ product) handles your account and project data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
        DocBrief · Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: September 12, 2026</p>

      <div className="prose-doc mt-8 space-y-6 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Who we are</h2>
          <p className="mt-2 text-sm leading-relaxed">
            DocBrief is a WedgeWerks™ product that helps creators turn a written brief into a
            short documentary-style script, voiceover, captions, and downloadable video assets.
            The service is operated by WedgeWerks and available at{" "}
            <a
              href="https://docbrief.wedgewerks.win"
              className="text-indigo-700 hover:underline"
            >
              https://docbrief.wedgewerks.win
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>Account details you provide (email, name, password hash).</li>
            <li>Project content you submit (briefs, generated scripts, and render outputs).</li>
            <li>Billing metadata from our payment provider when you subscribe (we do not store full card numbers).</li>
            <li>Basic technical logs needed to run and secure the service (e.g. request errors, auth events).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">How we use data</h2>
          <p className="mt-2 text-sm leading-relaxed">
            We use your data to provide DocBrief (authenticate you, generate and store project
            assets, deduct credits, process payments, and improve reliability). When AI polish or
            TTS is enabled, relevant brief/script text may be sent to our model/TTS provider solely
            to produce your output.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Sharing</h2>
          <p className="mt-2 text-sm leading-relaxed">
            We do not sell your personal information. We share data only with processors that help
            run the product (hosting, database, payments, email, and optional AI/TTS providers),
            or when required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Retention & deletion</h2>
          <p className="mt-2 text-sm leading-relaxed">
            We keep account and project data while your account is active and as needed for
            billing, security, and legal obligations. To request account deletion or data removal,
            contact{" "}
            <a href="mailto:admin@wedgewerks.win" className="text-indigo-700 hover:underline">
              admin@wedgewerks.win
            </a>
            ; we will remove or anonymize personal data that is no longer required.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Cookies & sessions</h2>
          <p className="mt-2 text-sm leading-relaxed">
            DocBrief uses a session cookie (or equivalent) to keep you signed in. We do not use
            third-party advertising trackers on the core product pages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Questions about privacy or general inquiries: contact{" "}
            <a href="mailto:info@wedgewerks.win" className="text-indigo-700 hover:underline">
              info@wedgewerks.win
            </a>
            . For account deletion or legal matters, contact{" "}
            <a href="mailto:admin@wedgewerks.win" className="text-indigo-700 hover:underline">
              admin@wedgewerks.win
            </a>
            . See also our{" "}
            <Link href="/terms" className="text-indigo-700 hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
