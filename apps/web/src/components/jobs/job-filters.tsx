import Link from 'next/link';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { JOB_LEVELS, JOB_INDUSTRIES, JOB_LOCATIONS } from '@launchly/shared';
import { Button } from '@/components/ui/button';

type JobFiltersProps = {
  currentFilters: {
    keyword?: string;
    industry?: string;
    level?: string;
    location?: string;
  };
};

const chip =
  'flex cursor-pointer items-center justify-center rounded-control px-2.5 py-1 text-xs select-none transition-colors ' +
  'bg-surface-muted text-muted-foreground hover:bg-surface-strong ' +
  'has-checked:bg-primary has-checked:text-primary-foreground has-checked:shadow-card ' +
  'has-focus-visible:ring-2 has-focus-visible:ring-ring';

export function JobFilters({ currentFilters }: JobFiltersProps) {
  const { keyword = '', level, industry = '', location = '' } = currentFilters;

  return (
    <form
      method="GET"
      action="/jobs"
      aria-label="Job search and filters"
      className="space-y-4 rounded-card bg-surface p-4 shadow-card"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-1.5 text-primary">
          <SlidersHorizontal className="size-4" strokeWidth={2} aria-hidden />
          <h2 className="font-display text-sm font-semibold text-foreground">Search & Filters</h2>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-xs font-medium text-subtle-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <RotateCcw className="size-3" aria-hidden />
          Reset
        </Link>
      </div>

      {/* Keyword search input */}
      <div className="space-y-1">
        <label
          htmlFor="filter-keyword"
          className="text-xs font-semibold tracking-wider text-subtle-foreground uppercase"
        >
          Keyword
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden
          />
          <input
            id="filter-keyword"
            type="text"
            name="keyword"
            defaultValue={keyword}
            placeholder="Job title or company..."
            className="w-full rounded-control border border-input bg-surface-muted py-1.5 pr-3 pl-8 text-xs text-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
      </div>

      {/* Career Level */}
      <fieldset className="space-y-1 pt-1">
        <legend className="mb-1 text-xs font-semibold tracking-wider text-subtle-foreground uppercase">
          Career Level
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          <label className={chip}>
            <input type="radio" name="level" value="" defaultChecked={!level} className="sr-only" />
            All Levels
          </label>
          {JOB_LEVELS.map((lvl) => (
            <label key={lvl} className={chip}>
              <input
                type="radio"
                name="level"
                value={lvl}
                defaultChecked={level === lvl}
                className="sr-only"
              />
              {lvl === 'INTERN' ? 'Intern' : lvl === 'FRESHER' ? 'Fresher' : 'Senior'}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Industry */}
      <div className="space-y-1 pt-1">
        <label
          htmlFor="filter-industry"
          className="text-xs font-semibold tracking-wider text-subtle-foreground uppercase"
        >
          Industry
        </label>
        <select
          id="filter-industry"
          name="industry"
          defaultValue={industry}
          className="w-full rounded-control border border-input bg-surface-muted px-2.5 py-1.5 text-xs text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <option value="">All Industries</option>
          {JOB_INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div className="space-y-1 pt-1">
        <label
          htmlFor="filter-location"
          className="text-xs font-semibold tracking-wider text-subtle-foreground uppercase"
        >
          Location
        </label>
        <select
          id="filter-location"
          name="location"
          defaultValue={location}
          className="w-full rounded-control border border-input bg-surface-muted px-2.5 py-1.5 text-xs text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <option value="">All Locations</option>
          {JOB_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="primary" className="w-full py-1.5 text-xs font-medium">
        Apply Filters
      </Button>
    </form>
  );
}
