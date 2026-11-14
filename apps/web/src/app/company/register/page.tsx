'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createCompany } from '@/lib/api/company';

// Option values are what the API stores; only the labels are translated.
const industryOptions = [
  { value: 'IT / Software', key: 'software' },
  { value: 'Fintech', key: 'fintech' },
  { value: 'E-Commerce', key: 'ecommerce' },
  { value: 'Marketing', key: 'marketing' },
  { value: 'Other', key: 'other' },
] as const;

const companySizeOptions = [
  { value: '1-50', key: 'small' },
  { value: '51-200', key: 'medium' },
  { value: '201-500', key: 'large' },
  { value: '500+', key: 'enterprise' },
] as const;

export default function CompanyRegisterPage() {
  const t = useTranslations('admin.companyRegister');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    industry: 'IT / Software',
    companySize: '1-50',
    website: '',
    description: '',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check the logo is a PNG/JPG image under 2MB
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, logo: t('logo.invalidType') }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: t('logo.tooLarge') }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.logo;
      return next;
    });

    setLogoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = t('name.required');
    if (!formData.address.trim()) errs.address = t('address.required');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      await createCompany({
        ...formData,
        logoUrl: logoPreview || undefined,
      });
      setSuccessMessage(t('success'));
      setFormData({
        name: '',
        address: '',
        industry: 'IT / Software',
        companySize: '1-50',
        website: '',
        description: '',
      });
      setLogoPreview(null);
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : t('failed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('heading')}</h1>
        <p className="mb-6 text-sm text-gray-500">{t('intro')}</p>

        {successMessage && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo with preview */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('logo.label')}
            </label>
            <div className="flex items-center gap-5">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt={t('logo.previewAlt')}
                  className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-2 text-center text-xs text-gray-400">
                  {t('logo.empty')}
                </div>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleLogoChange}
                className="cursor-pointer text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-gray-200"
              />
            </div>
            {errors.logo && <p className="mt-1 text-xs text-red-600">{errors.logo}</p>}
          </div>

          {/* Company name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('name.label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none ${
                errors.name
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-gray-300 focus:border-indigo-600'
              }`}
              placeholder={t('name.placeholder')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('address.label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={`w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none ${
                errors.address
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-gray-300 focus:border-indigo-600'
              }`}
              placeholder={t('address.placeholder')}
            />
            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
          </div>

          {/* Industry and size */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('industry.label')}
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-600"
              >
                {industryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(`industry.options.${option.key}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('companySize.label')}
              </label>
              <select
                value={formData.companySize}
                onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-600"
              >
                {companySizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(`companySize.options.${option.key}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('website.label')}
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-600"
              placeholder="https://example.com"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('description.label')}
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-600"
              placeholder={t('description.placeholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
