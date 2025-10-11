import { Bell, User, LogOut, Shield, ClipboardList, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ThemeToggle } from "./theme-toggle"
import { LanguageToggle } from "./language-toggle"
import { useAuth } from "@/lib/auth"
import { useSettings } from "@/lib/settings"
import { useLocation } from "wouter"
import { useTranslation } from "react-i18next"

interface DashboardHeaderProps {
  userName?: string
  userRole?: string
  alertCount?: number
  onProfileClick?: () => void
  onLogoutClick?: () => void
}

export function DashboardHeader({
  alertCount = 3,
  onProfileClick = () => console.log("Profile clicked")
}: Partial<DashboardHeaderProps> = {}) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [, navigate] = useLocation();
  const userName = user?.name || t('header.adminUser');
  const userRole = user?.role === 'admin' ? t('header.administrator') : t('header.hqTeam');

  // Helper function to check button visibility
  const isButtonVisible = (buttonKey: string) => {
    if (user?.role === 'admin') return true; // Admin always sees everything
    if (!settings?.dashboardVisibility?.standard) return true; // Default to visible if no settings
    return settings.dashboardVisibility.standard[buttonKey as keyof typeof settings.dashboardVisibility.standard] ?? true;
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="mr-4 flex items-center">
          <img
            src="/images/kaka_logo_noBG.png"
            alt="KakaHQ Logo"
            className="h-12 w-auto"
          />
        </div>

        <nav className="hidden md:flex items-center space-x-4">
          {isButtonVisible('ordersButton') && (
            <Button
              variant="ghost"
              onClick={() => navigate('/orders')}
              className="flex items-center space-x-2"
            >
              <ClipboardList className="h-4 w-4" />
              <span>{t('nav.orders')}</span>
            </Button>
          )}
          {isButtonVisible('inventoryButton') && (
            <Button
              variant="ghost"
              onClick={() => navigate('/inventory')}
              className="flex items-center space-x-2"
            >
              <Package className="h-4 w-4" />
              <span>{t('nav.inventory')}</span>
            </Button>
          )}
        </nav>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search could go here in the future */}
          </div>
          
          <div className="flex items-center space-x-2">
            {isButtonVisible('alertsButton') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative cursor-pointer"
                    onClick={() => navigate('/alerts')}
                    data-testid="button-notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {alertCount > 0 && (
                      <Badge
                        variant="default"
                        className="absolute -top-0.5 -right-0.5 h-5 w-5 min-w-5 rounded-full flex items-center justify-center p-0 text-xs"
                      >
                        {alertCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('header.activeAlerts', { count: alertCount })}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <ThemeToggle />

            <LanguageToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={userName} />
                    <AvatarFallback>
                      {userName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userRole}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onProfileClick} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('header.profile')}</span>
                </DropdownMenuItem>
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="menu-admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>{t('header.adminDashboard')}</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('header.logOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}