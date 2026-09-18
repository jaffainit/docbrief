import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — DocBrief",
  description: "Terms for using DocBrief, a WedgeWerks™ product.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
        DocBrief · Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: September 12, 2026</p>

      <div className="mt-8 space-y-6 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Agreement</h2>
          <p className="mt-2 text-sm leading-relaxed">
            By creating an account or using DocBrief (a WedgeWerks™ product), you agree to these
            Terms. If you do not agree, do not use the service. The service is available at{" "}
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
          <h2 className="text-lg font-semibold text-slate-900">The service</h2>
          <p className="mt-2 text-sm leading-relaxed">
            DocBrief helps you turn a written brief into a polished documentary-style script,
            optional voiceover, captions, placeholder B-roll stills, and a downloadable MP4 when
            rendering succeeds. Features may change as the product evolves. Outputs are tools for
            creators — you are responsible for reviewing scripts and media before publishing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Accounts & credits</h2>
          <p className="mt-2 text-sm leading-relaxed">
            You must provide accurate account information and keep credentials secure. Plans and
            credits are shown in-product; generating content may consume credits. Free and paid
            limits are enforced as displayed at the time of use. Unused credits are not
            guaranteed to roll forever unless a plan says otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Acceptable use</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>Do not use DocBrief for unlawful, harmful, or infringing content.</li>
            <li>Do not attempt to abuse, scrape, or disrupt the service or other users.</li>
            <li>Do not misrepresent generated content as independently verified journalism without review.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Your content</h2>
          <p className="mt-2 text-sm leading-relaxed">
            You retain rights to briefs and materials you upload. You grant DocBrief a limited
            license to process that content solely to provide the service (including polish, TTS,
            rendering, and storage). You confirm you have the rights needed to submit that
            content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Paid plans are billed through our payment provider. Fees are generally non-refundable
            except where required by law or explicitly offered. Taxes may apply.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Disclaimer & liability</h2>
          <p className="mt-2 text-sm leading-relaxed">
            DocBrief is provided &quot;as is.&quot; We do not guarantee uninterrupted availability,
            perfect scripts, or that AI polish will never err. To the fullest extent permitted by
            law, WedgeWerks / DocBrief is not liable for indirect or consequential damages arising
            from use of the service. Our aggregate liability for a claim is limited to the amounts
            you paid us for DocBrief in the three months before the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Changes</h2>
          <p className="mt-2 text-sm leading-relaxed">
            We may update these Terms. Continued use after changes means you accept the updated
            Terms. See also our{" "}
            <Link href="/privacy" className="text-indigo-700 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <p className="mt-2 text-sm leading-relaxed">
            General inquiries: contact{" "}
            <a href="mailto:info@wedgewerks.win" className="text-indigo-700 hover:underline">
              info@wedgewerks.win
            </a>
            . Legal matters or account deletion requests: contact{" "}
            <a href="mailto:admin@wedgewerks.win" className="text-indigo-700 hover:underline">
              admin@wedgewerks.win
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
