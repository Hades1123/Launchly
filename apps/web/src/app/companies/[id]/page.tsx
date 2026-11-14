'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CompanyDto } from '@launchly/shared';
import { getCompany } from '@/lib/api/company';
import { ApiError } from '@/lib/api/http';

export default function PublicCompanyDetailPage() {
  const t = useTranslations('jobs.company');
  const params = useParams();
  const id = params?.id as string;
  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setError(null);
      try {
        const data = await getCompany(id);
        if (active) setCompany(data);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiError && cause.code === 'NOT_FOUND') {
          setNotFound(true);
        } else {
          setError(cause instanceof ApiError ? cause.message : t('loadError'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, t]);

  if (loading) {
    return <div className="py-20 text-center font-medium text-gray-500">{t('loading')}</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-800">{t('notFoundTitle')}</h2>
        <p className="text-sm leading-relaxed text-gray-500">{t('notFoundBody')}</p>
      </div>
    );
  }

  // Prefix a scheme so the website link is never treated as a relative URL.
  const formatWebsiteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>

        <div className="-mt-12 p-8">
          {/* Header & Logo */}
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-indigo-600">
                    {company.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-sm text-gray-500">{company.address}</p>
              </div>
            </div>

            {company.website && (
              <a
                href={formatWebsiteUrl(company.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                {t('website')}
              </a>
            )}
          </div>

          {/* Tags */}
          <div className="mb-8 flex flex-wrap gap-2">
            {company.industry && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {company.industry}
              </span>
            )}
            {company.companySize && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {company.companySize}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="border-t border-gray-100 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('about')}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-gray-600">
              {company.description || t('noDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
