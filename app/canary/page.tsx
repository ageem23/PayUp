// Public, un-gated health-check route used to verify core web-server
// availability end-to-end. Keep it a plain static Server Component — no
// auth, no redirects, no dynamic APIs — so it always prerenders and
// returns 200.
const status = {
  status: "operational",
  version: "1.0.0",
} as const;

export default function CanaryPage() {
  return (
    <main className="min-h-screen p-8">
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </main>
  );
}
