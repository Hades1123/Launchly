import { ShieldCheck } from 'lucide-react';

/*
 * Data-protection switch (Decree 13/2023). Uncontrolled and styled with `group-has-checked:`
 * so it works without client JS; persisting the preference comes with the CV API.
 */
export function PrivacyToggle() {
  return (
    <label
      title="Bảo vệ dữ liệu cá nhân theo NĐ 13/2023/NĐ-CP"
      className="group flex cursor-pointer items-center gap-2 rounded-control px-1 py-0.5 transition-colors select-none hover:bg-secondary has-focus-visible:ring-2 has-focus-visible:ring-ring"
    >
      <input
        type="checkbox"
        name="privacy"
        defaultChecked
        aria-label="Bảo vệ dữ liệu cá nhân, AI không lưu trữ CV"
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-5 w-9 shrink-0 rounded-full bg-input transition-colors group-has-checked:bg-success"
      >
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-card transition-transform group-has-checked:translate-x-4" />
      </span>
      <span className="hidden flex-col lg:flex">
        <span className="flex items-center gap-0.5 text-xs font-semibold">
          <ShieldCheck className="size-3.5 text-success" strokeWidth={1.75} aria-hidden />
          NĐ 13/2023
        </span>
        <span className="font-mono text-xs leading-none text-subtle-foreground">
          AI Zero-Retention
        </span>
      </span>
    </label>
  );
}
