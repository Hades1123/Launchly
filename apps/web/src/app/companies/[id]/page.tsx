'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { CompanyDto } from '@launchly/shared';
import { getCompany } from '@/lib/api/company';
import { ApiError } from '@/lib/api/http';

export default function PublicCompanyDetailPage() {
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
          setError(
            cause instanceof ApiError ? cause.message : 'Không thể tải thông tin doanh nghiệp.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 font-medium">
        Đang tải thông tin doanh nghiệp...
      </div>
    );
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
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy công ty</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Hồ sơ công ty này không tồn tại hoặc hiện đang trong trạng thái chờ ban quản trị phê duyệt.
        </p>
      </div>
    );
  }

  // Chuẩn hóa đường dẫn website để không bị lỗi relative URL
  const formatWebsiteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>

        <div className="p-8 -mt-12">
          {/* Header & Logo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-4 border-white shadow-md bg-white overflow-hidden flex items-center justify-center">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-full h-full object-cover"
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
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
              >
                Ghé thăm Website ↗
              </a>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {company.industry && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                {company.industry}
              </span>
            )}
            {company.companySize && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                {company.companySize}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Về chúng tôi</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {company.description || 'Chưa có thông tin mô tả chi tiết.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}