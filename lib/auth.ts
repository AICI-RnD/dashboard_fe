// Định nghĩa kiểu dữ liệu cho response
interface LoginResponse {
  success: boolean
  message?: string
  token?: string
  // user?: {
  //   id: string
  //   username: string
  // }
}

interface ResetPasswordResponse {
  success: boolean
  message?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
const LOGIN_API_ENDPOINT = `${API_BASE_URL}/auth/login`
const RESET_PASS_API_ENDPOINT = `${API_BASE_URL}/auth/reset-password`

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await fetch(LOGIN_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const data = await response.json()

    if (response.ok && data.access_token) {
      localStorage.setItem('auth_token', data.access_token)
      
      // if (data.user) {
      //   localStorage.setItem('user', JSON.stringify(data.user))
      // }
      
      return {
        success: true,
        token: data.token,
        // user: data.user,
      }
    }

    return {
      success: false,
      message: data.message || 'Tên đăng nhập hoặc mật khẩu không đúng',
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.',
    }
  }
}

// Hàm đăng xuất
export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')

  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// Hàm kiểm tra trạng thái đăng nhập
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}

// Lấy token
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

// Lấy thông tin user hiện tại
export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export async function resetPassword(
  username: string, 
  email: string, 
  newPassword: string
): Promise<ResetPasswordResponse> {
  try {
    const response = await fetch(RESET_PASS_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        username, 
        email, 
        new_password: newPassword
      }),
    })

    const data = await response.json()

    if (response.ok) {
      return {
        success: true,
        message: data.message || 'Đặt lại mật khẩu thành công',
      }
    }

    return {
      success: false,
      message: data.message || 'Đặt lại mật khẩu thất bại',
    }
  } catch (error) {
    console.error('Reset password error:', error)
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.',
    }
  }
}