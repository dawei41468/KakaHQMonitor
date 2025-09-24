import { ThemeProvider } from "../theme-provider"
import { DashboardHeader } from "../dashboard-header"

export default function DashboardHeaderExample() {
  return (
    <ThemeProvider>
      <DashboardHeader />
    </ThemeProvider>
  )
}