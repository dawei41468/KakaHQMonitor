import { LoginForm } from "@/components/login-form"

export default function Login() {
  const handleLogin = (email: string, password: string) => {
    // todo: remove mock functionality - implement real authentication
    console.log("Login attempt:", { email, password })
    
    // Mock successful login - redirect to dashboard
    setTimeout(() => {
      window.location.href = "/"
    }, 1000)
  }

  const handleForgotPassword = () => {
    // todo: remove mock functionality - implement password reset
    console.log("Forgot password functionality")
  }

  return (
    <LoginForm 
      onLogin={handleLogin}
      onForgotPassword={handleForgotPassword}
    />
  )
}