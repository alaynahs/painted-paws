import { requireAdmin } from "@/lib/supabase/admin";
import { getPricingConfig } from "@/lib/pricing/config";
import QuickQuoteTool from "@/components/quick-quote-tool";

export default async function AdminQuickQuotePage() {
  await requireAdmin();
  const config = await getPricingConfig();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Quick Quote
      </h1>
      <p className="mt-3 text-sm text-muted">
        For someone who isn&apos;t a customer yet — enter their pet&apos;s
        details, then screenshot the result below to send them.
      </p>

      <div className="mt-8">
        <QuickQuoteTool config={config} />
      </div>
    </div>
  );
}
