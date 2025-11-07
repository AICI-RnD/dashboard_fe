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

interface CheckAuthResponse {
  valid: boolean
  message?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
const LOGIN_API_ENDPOINT = `${API_BASE_URL}/auth/login`
const RESET_PASS_API_ENDPOINT = `${API_BASE_URL}/auth/reset-password`
const CHECK_AUTH_API_ENDPOINT = `${API_BASE_URL}/auth/check-token`

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await fetch(LOGIN_API_ENDPOINT, {
      method: 'POST',
      headers: {
        "ngrok-skip-browser-warning": "true",
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

// Hàm kiểm tra trạng thái đăng nhập (local)
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
        "ngrok-skip-browser-warning": "true",
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

export async function checkAuthToken(): Promise<boolean> {
  try {
    const token = getToken()
    
    // Nếu không có token trong localStorage, return false
    if (!token) {
      return false
    }

    const response = await fetch(CHECK_AUTH_API_ENDPOINT, {
      method: 'GET',
      headers: {
        "ngrok-skip-browser-warning": "true",
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // Trả về true nếu status code là 200, false cho tất cả các trường hợp khác
    return response.status === 200
    
  } catch (error) {
    console.error('Check auth token error:', error)
    // Trả về false nếu có lỗi kết nối hoặc exception
    return false
  }
}


export async function validateAuthToken(): Promise<CheckAuthResponse> {
  try {
    const token = getToken()
    
    if (!token) {
      return {
        valid: false,
        message: 'Token không tồn tại',
      }
    }

    const response = await fetch(CHECK_AUTH_API_ENDPOINT, {
      method: 'GET',
      headers: {
        "ngrok-skip-browser-warning": "true",
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 200) {
      return {
        valid: true,
        message: 'Token hợp lệ',
      }
    }

    // Thử parse response để lấy message từ backend
    try {
      const data = await response.json()
      return {
        valid: false,
        message: data.message || `Token không hợp lệ (Status: ${response.status})`,
      }
    } catch {
      return {
        valid: false,
        message: `Token không hợp lệ (Status: ${response.status})`,
      }
    }
    
  } catch (error) {
    console.error('Validate auth token error:', error)
    return {
      valid: false,
      message: 'Không thể kết nối đến máy chủ',
    }
  }
}