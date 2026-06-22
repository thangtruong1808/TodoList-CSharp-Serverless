import { apiFetch, type AuthResponse } from './client'

export interface RegisterPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string | null
  role?: 'User' | 'Admin'
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ForgotPasswordResponse {
  message: string
  resetToken?: string
  resetUrl?: string
}

export function register(payload: RegisterPayload) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload: LoginPayload) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logout(refreshToken: string) {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

export function forgotPassword(email: string) {
  return apiFetch<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}
