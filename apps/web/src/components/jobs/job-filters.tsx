import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/*
 * Filter panel. Inputs are uncontrolled and styled with `has-checked:` so the panel works
 * without client JS; wiring them to the query string comes with the jobs API.
 */

const chip =
  'flex cursor-pointer items-center gap-1 rounded-control px-2 py-1 text-xs select-none transition-colors ' +
  'bg-surface-muted text-muted-foreground hover:bg-surface-strong ' +
  'has-checked:bg-primary has-checked:text-primary-foreground has-checked:shadow-card ' +
  'has-focus-visible:ring-2 has-focus-visible:ring-ring';

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-1 pt-1">
      <legend className="mb-1 text-xs font-semibold tracking-wider text-subtle-foreground uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

const levels = [
  { label: 'Intern', checked: true },
  { label: 'Fresher (0-1 năm)', checked: true },
  { label: 'Junior (1-2 năm)', checked: false },
];

const perks = [
  { label: 'Không yêu cầu kinh nghiệm', highlight: false },
  { label: 'Có lộ trình đào tạo & 1-on-1 mentoring', highlight: true },
  { label: 'Hỗ trợ mộc dấu thực tập tốt nghiệp', highlight: false },
];

const salaries = [
  { label: '6tr - 12tr VNĐ', value: '6-12', checked: false },
  { label: '12tr - 18tr VNĐ', value: '12-18', checked: true },
];

const locations = [
  { label: 'TP. Hồ Chí Minh', checked: true },
  { label: 'Hà Nội', checked: false },
  { label: 'Remote', checked: false },
];

export function JobFilters() {
  return (
    <form
      aria-label="Bộ lọc việc làm"
      className="space-y-4 rounded-card bg-surface p-4 shadow-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-primary">
          <SlidersHorizontal className="size-5" strokeWidth={1.75} aria-hidden />
          <h2 className="font-display text-sm font-semibold text-foreground">Bộ lọc chuyên sâu</h2>
        </div>
        <button
          type="reset"
          className="rounded-control text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Đặt lại
        </button>
      </div>

      <FilterGroup title="Cấp bậc mục tiêu">
        <div className="flex flex-wrap gap-1">
          {levels.map((level) => (
            <label key={level.label} className={chip}>
              <input
                type="checkbox"
                name="level"
                defaultChecked={level.checked}
                className="accent-primary"
              />
              {level.label}
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Đặc quyền ứng viên">
        <div className="space-y-1">
          {perks.map((perk) => (
            <label
              key={perk.label}
              className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
            >
              <input type="checkbox" name="perk" defaultChecked className="accent-primary" />
              <span className={cn(perk.highlight && 'font-medium text-primary')}>{perk.label}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Mức lương tháng">
        <div className="grid grid-cols-2 gap-1">
          {salaries.map((salary) => (
            <label key={salary.value} className={cn(chip, 'justify-center font-semibold')}>
              <input
                type="radio"
                name="salary"
                value={salary.value}
                defaultChecked={salary.checked}
                className="sr-only"
              />
              {salary.label}
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Khu vực làm việc">
        <div className="flex flex-wrap gap-1">
          {locations.map((location) => (
            <label key={location.label} className={chip}>
              <input
                type="checkbox"
                name="location"
                defaultChecked={location.checked}
                className="sr-only"
              />
              {location.label}
            </label>
          ))}
        </div>
      </FilterGroup>
    </form>
  );
}
