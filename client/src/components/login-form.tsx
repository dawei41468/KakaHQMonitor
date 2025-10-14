import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"

interface LoginFormProps {
  onLogin?: (email: string, password: string) => void
  onForgotPassword?: () => void
  theme?: 'light' | 'dark'
}

export function LoginForm({
  onLogin = () => {},
  onForgotPassword = () => {},
  theme = 'light'
}: LoginFormProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: t('login.validationError'),
        description: t('login.fillAllFields'),
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      await onLogin(email, password)
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`w-full max-w-md ${
      theme === 'dark'
        ? 'bg-gray-800 border-gray-700 text-white'
        : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-center mb-2">
          <img src="/images/kaka_logo_noBG.png" alt="Kaka Logo" className="h-20 w-auto" />
        </div>
        <CardTitle className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('login.welcomeBack')}</CardTitle>
          <CardDescription className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
            {t('login.signInToDashboard')}
          </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>{t('common.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              data-testid="input-email"
              className={theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>{t('common.password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                data-testid="input-password"
                className={`pr-12 ${theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
                }`}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              className={`p-0 h-auto text-sm ${
                theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
              onClick={onForgotPassword}
              data-testid="button-forgot-password"
            >
              {t('login.forgotPassword')}
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? t('login.signingIn') : t('login.signIn')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}