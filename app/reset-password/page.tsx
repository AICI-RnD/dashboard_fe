import ResetPasswordForm from '@/components/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Đặt lại mật khẩu
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Nhập thông tin để đặt lại mật khẩu của bạn
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}