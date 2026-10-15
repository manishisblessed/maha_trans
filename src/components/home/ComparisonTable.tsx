import { Check, X } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "./_shared/SectionHeading";

type Row = {
  feature: string;
  transpe: boolean | string;
  traditional: boolean | string;
  bankBc: boolean | string;
};

const ROWS: Row[] = [
  { feature: "Joining fee", transpe: "₹0", traditional: "₹5,000–₹25,000", bankBc: "₹0" },
  { feature: "Services available", transpe: "60+", traditional: "5–10", bankBc: "3–5" },
  { feature: "Commission credit", transpe: "Instant", traditional: "Monthly", bankBc: "Monthly" },
  { feature: "Own branding / white-label", transpe: true, traditional: false, bankBc: false },
  { feature: "BBPS bill payments", transpe: true, traditional: "Limited", bankBc: false },
  { feature: "POS terminal rental", transpe: true, traditional: false, bankBc: false },
  { feature: "Payment gateway", transpe: true, traditional: false, bankBc: false },
  { feature: "Distributor programme", transpe: true, traditional: false, bankBc: false },
  { feature: "24x7 wallet withdrawal", transpe: true, traditional: false, bankBc: false },
  { feature: "Multi-language support", transpe: "9 languages", traditional: "1–2", bankBc: "1" },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="font-semibold text-ink-900">{value}</span>;
  }
  return value ? (
    <span className="inline-flex items-center gap-1 font-semibold text-accent-700">
      <Check size={16} weight="bold" aria-hidden />
      <span className="sr-only">Yes</span>
    </span>
  ) : (
    <span className="text-ink-300">
      <X size={16} weight="bold" aria-hidden />
      <span className="sr-only">No</span>
    </span>
  );
}

export function ComparisonTable() {
  return (
    <section
      className="bg-white py-20 md:py-28"
      aria-labelledby="compare-heading"
    >
      <div className="container-x">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Why TRANSPE"
            title={<span id="compare-heading">See how we stack up.</span>}
            sub="A transparent comparison with traditional agent platforms and bank BC models."
          />
        </Reveal>

        <Reveal className="mt-12">
          <div className="overflow-x-auto rounded-3xl border border-ink-100 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">
                TRANSPE vs traditional agent platforms vs bank BC model
              </caption>
              <thead>
                <tr className="border-b border-ink-100 text-left">
                  <th
                    scope="col"
                    className="px-6 py-4 font-semibold text-ink-500"
                  >
                    Feature
                  </th>
                  <th
                    scope="col"
                    className="bg-royal-50/50 px-6 py-4 font-display text-base font-semibold tracking-[-0.01em] text-ink-950"
                  >
                    TRANSPE
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-display text-base font-semibold tracking-[-0.01em] text-ink-950"
                  >
                    Traditional platforms
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-display text-base font-semibold tracking-[-0.01em] text-ink-950"
                  >
                    Bank BC model
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-ink-100 last:border-0"
                  >
                    <th
                      scope="row"
                      className="px-6 py-3.5 text-left font-medium text-ink-700"
                    >
                      {row.feature}
                    </th>
                    <td className="bg-royal-50/50 px-6 py-3.5">
                      <CellValue value={row.transpe} />
                    </td>
                    <td className="px-6 py-3.5">
                      <CellValue value={row.traditional} />
                    </td>
                    <td className="px-6 py-3.5">
                      <CellValue value={row.bankBc} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-ink-500">
            Comparison based on publicly available information from leading agent platforms and BC programmes as of October 2026.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
