import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/lib/auth"
import { apiRequest } from "@/lib/queryClient"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  const handleToggle = async () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)

    if (user) {
      try {
        await apiRequest('PUT', '/api/user/preferences', { theme: newTheme })
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      data-testid="button-theme-toggle"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}