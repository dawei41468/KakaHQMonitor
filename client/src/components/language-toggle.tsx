import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/auth"
import { apiRequest } from "@/lib/queryClient"

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const { user } = useAuth()

  const handleToggle = async () => {
    const newLang = i18n.language === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);

    if (user) {
      try {
        await apiRequest('PUT', '/api/user/preferences', { language: newLang })
      } catch (error) {
        console.error('Failed to save language preference:', error)
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      data-testid="button-language-toggle"
    >
      <span className={`text-sm transition-all ${i18n.language === 'en' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>EN</span>
      <span className={`absolute text-sm transition-all ${i18n.language === 'zh' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>中文</span>
      <span className="sr-only">Toggle language</span>
    </Button>
  )
}