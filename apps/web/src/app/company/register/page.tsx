'use client';

import React, { useState } from 'react';

export default function CompanyRegisterPage() {
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

  // Validate kích thước logo < 2MB và định dạng ảnh
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, logo: 'Logo phải là định dạng PNG hoặc JPG.' }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: 'Dung lượng logo phải nhỏ hơn 2MB.' }));
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
    if (!formData.name.trim()) errs.name = 'Tên công ty là bắt buộc.';
    if (!formData.address.trim()) errs.address = 'Địa chỉ công ty là bắt buộc.';
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
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: send `Authorization: Bearer <accessToken>` once web auth lands.
        },
        body: JSON.stringify({
          ...formData,
          logoUrl: logoPreview || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setErrors({ general: result.error?.message || 'Đăng ký công ty thất bại.' });
      } else {
        setSuccessMessage('Đăng ký công ty thành công! Hồ sơ đang ở trạng thái chờ duyệt (Pending).');
        setFormData({
          name: '',
          address: '',
          industry: 'IT / Software',
          companySize: '1-50',
          website: '',
          description: '',
        });
        setLogoPreview(null);
      }
    } catch {
      setErrors({ general: 'Không thể kết nối tới máy chủ API (/api).' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký thông tin Công ty</h1>
        <p className="text-sm text-gray-500 mb-6">Tạo hồ sơ doanh nghiệp trên Launchly để bắt đầu tuyển dụng ứng viên.</p>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo có preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo công ty (Tối đa 2MB, PNG/JPG)</label>
            <div className="flex items-center gap-5">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center px-2">
                  Chưa có logo
                </div>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleLogoChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200 cursor-pointer"
              />
            </div>
            {errors.logo && <p className="text-xs text-red-600 mt-1">{errors.logo}</p>}
          </div>

          {/* Tên công ty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên công ty <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${
                errors.name ? 'border-red-500 bg-red-50/20' : 'border-gray-300 focus:border-indigo-600'
              }`}
              placeholder="Ví dụ: Launchly Corp"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ văn phòng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors ${
                errors.address ? 'border-red-500 bg-red-50/20' : 'border-gray-300 focus:border-indigo-600'
              }`}
              placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
            />
            {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
          </div>

          {/* Lĩnh vực & Quy mô */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực hoạt động</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-indigo-600"
              >
                <option value="IT / Software">Công nghệ thông tin / Phần mềm</option>
                <option value="Fintech">Tài chính công nghệ (Fintech)</option>
                <option value="E-Commerce">Thương mại điện tử</option>
                <option value="Marketing">Truyền thông / Tiếp thị</option>
                <option value="Other">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quy mô công ty</label>
              <select
                value={formData.companySize}
                onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-indigo-600"
              >
                <option value="1-50">1 - 50 nhân viên</option>
                <option value="51-200">51 - 200 nhân viên</option>
                <option value="201-500">201 - 500 nhân viên</option>
                <option value="500+">Trên 500 nhân viên</option>
              </select>
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website công ty</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-indigo-600"
              placeholder="https://example.com"
            />
          </div>

          {/* Giới thiệu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công ty</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-indigo-600"
              placeholder="Giới thiệu sứ mệnh, môi trường làm việc..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Đang gửi thông tin...' : 'Hoàn tất Đăng ký Công ty'}
          </button>
        </form>
      </div>
    </div>
  );
}