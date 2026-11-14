import { useTranslations } from 'next-intl';

const steps = ['profile', 'search', 'apply'] as const;

/** Three numbered steps from sign-up to a tracked application. */
export function HowItWorks() {
  const t = useTranslations('landing.howItWorks');
  return (
    <section aria-labelledby="how-title" className="bg-background">
      <div className="mx-auto grid w-full max-w-page gap-10 px-4 py-16 md:px-8 lg:grid-cols-12 lg:py-20">
        <div className="space-y-2 lg:col-span-4">
          <h2
            id="how-title"
            className="font-display text-3xl font-bold tracking-tight text-foreground"
          >
            {t('title')}
          </h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3 lg:col-span-8">
          {steps.map((step, index) => (
            <li key={step} className="space-y-3">
              <span className="block font-display text-5xl font-bold text-primary-subtle-foreground/25">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
