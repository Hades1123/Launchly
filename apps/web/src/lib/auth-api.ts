import {
  apiErrorSchema,
  type ErrorCode,
  type ErrorDetail,
} from '@launchly/shared';

type SafeParseResult<T> = { success: true; data: T } | { success: false };
type ResponseSchema<T> = { safeParse: (input: unknown) => SafeParseResult<T> };

export class AuthRequestError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new AuthRequestError(
        'INTERNAL_ERROR',
        'Không thể kết nối máy chủ. Hãy kiểm tra API rồi thử lại.',
        0,
      );
    }
    throw error;
  }

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AuthRequestError(
        'INTERNAL_ERROR',
        'Máy chủ chưa thể xử lý yêu cầu. Vui lòng thử lại.',
        response.status,
      );
    }
    const parsedError = apiErrorSchema.safeParse(payload);
    if (!parsedError.success) {
      throw new AuthRequestError(
        'INTERNAL_ERROR',
        'Máy chủ chưa thể xử lý yêu cầu. Vui lòng thử lại.',
        response.status,
      );
    }
    throw new AuthRequestError(
      parsedError.data.error.code,
      parsedError.data.error.message,
      response.status,
      parsedError.data.error.details,
    );
  }
  return response;
}

export async function authRequest<T>(
  path: string,
  schema: ResponseSchema<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await request(path, init);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AuthRequestError(
      'INTERNAL_ERROR',
      'Máy chủ trả về dữ liệu không hợp lệ.',
      response.status,
    );
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AuthRequestError(
      'INTERNAL_ERROR',
      'Máy chủ trả về dữ liệu không hợp lệ.',
      response.status,
    );
  }
  return result.data;
}

export async function authRequestNoContent(
  path: string,
  init?: RequestInit,
): Promise<void> {
  const response = await request(path, init);
  if (response.status !== 204) {
    throw new AuthRequestError(
      'INTERNAL_ERROR',
      'Máy chủ trả về phản hồi không mong đợi.',
      response.status,
    );
  }
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof AuthRequestError)) {
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

export function fieldErrorMessage(
  error: AuthRequestError,
  field: string,
): string | undefined {
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
