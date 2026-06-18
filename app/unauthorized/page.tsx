import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Access Restricted</h1>
      <p className="max-w-md text-neutral-600">
        Your email is not registered on the platform whitelist. Please contact
        the administrator.
      </p>
      <Link href="/" className="font-medium underline">
        Return home
      </Link>
    </main>
  );
}
