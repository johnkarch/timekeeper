import Link from "next/link";
import { requestPasswordReset } from "./actions";
import DismissibleBanner from "@/components/dismissible-banner";
import SubmitButton from "@/components/submit-button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Reset your password</h1>
        <p className="mb-6 text-sm text-gray-500">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {error && <DismissibleBanner message={error} variant="error" className="mb-4" />}

        {success ? (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form action={requestPasswordReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <SubmitButton
              pendingLabel="Sending…"
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Send reset link
            </SubmitButton>
          </form>
        )}

        <p className="mt-6 text-xs text-gray-400">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
