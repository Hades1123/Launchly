import { ApiError } from '@/lib/api/http';
import type { UserRole } from '@launchly/shared';

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email hoặc mật khẩu chưa chính xác.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Tài khoản chưa được xác minh. Hãy kiểm tra email hoặc gửi lại liên kết xác minh.';
    case 'ACCOUNT_LOCKED':
      return 'Tài khoản đang bị khóa. Vui lòng liên hệ bộ phận hỗ trợ.';
    case 'EMAIL_ALREADY_REGISTERED':
    case 'ACCOUNT_ALREADY_REGISTERED':
      return 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.';
    case 'INVALID_OR_EXPIRED_TOKEN':
      return 'Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu một liên kết mới.';
    case 'INVALID_GOOGLE_IDENTITY':
      return 'Không thể xác minh tài khoản Google. Hãy thử lại.';
    case 'GOOGLE_SIGN_IN_UNAVAILABLE':
      return 'Đăng nhập Google hiện chưa được cấu hình.';
    case 'RATE_LIMITED':
      return 'Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.';
    case 'EMAIL_DELIVERY_FAILED':
      return 'Chưa thể gửi email lúc này. Vui lòng thử lại sau.';
    case 'UNAUTHENTICATED':
    case 'INVALID_SESSION':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 'VALIDATION_ERROR':
      return 'Vui lòng kiểm tra lại thông tin đã nhập.';
    default:
      return error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}

export function fieldErrorMessage(error: ApiError, field: string): string | undefined {
  const detail = error.details?.find((item) => item.path[0] === field);
  if (!detail) return undefined;
  if (field === 'email') return 'Vui lòng nhập địa chỉ email hợp lệ.';
  if (field === 'password') return 'Mật khẩu cần có từ 8 đến 128 ký tự.';
  return detail.message;
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/jobs';
  }
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return '/jobs';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/jobs';
  }
}

type NamedUser = { fullName: string | null; email: string; role: UserRole };

export function userDisplayName(user: NamedUser): string {
  return user.fullName?.trim() || user.email;
}

/** Up to two initials for the avatar bubble. */
export function userInitials(user: NamedUser): string {
  return (
    userDisplayName(user)
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export const ROLE_LABELS: Record<UserRole, string> = {
  CANDIDATE: 'Ứng viên',
  RECRUITER: 'Nhà tuyển dụng',
  ADMIN: 'Quản trị viên',
};
