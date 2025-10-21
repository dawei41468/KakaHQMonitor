import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress: string;
  timestamp: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changesDiff?: Record<string, unknown>;
  sessionId?: string;
}

export default function AuditLogs() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    userId: "",
    action: "",
    entityType: "",
    limit: "50",
    offset: "0",
  });

  const { data, isLoading, error } = useQuery<{ items: AuditLog[], total: number }>({
    queryKey: (() => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      return [`/api/admin/audit-logs?${params.toString()}`];
    })(),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: "0" })); // Reset offset on filter change
  };

  const handleExport = () => {
    // Simple CSV export
    if (!data?.items) return;

    const headers = ["Timestamp", "User ID", "Action", "Entity Type", "Entity ID", "IP Address"];
    const csvContent = [
      headers.join(","),
      ...data.items.map((log: AuditLog) =>
        [
          new Date(log.timestamp).toLocaleString(),
          log.userId || "",
          log.action,
          log.entityType,
          log.entityId || "",
          log.ipAddress,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{t("admin.errorLoadingAuditLogs")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("admin.auditLogs")}</h2>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          {t("admin.exportCsv")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium">{t("admin.dateFrom")}</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.dateTo")}</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.userId")}</label>
              <Input
                placeholder={t("admin.userId")}
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.action")}</label>
              <Select value={filters.action || "all"} onValueChange={(value) => handleFilterChange("action", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.allActions")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allActions")}</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">{t("admin.loginSuccess")}</SelectItem>
                  <SelectItem value="LOGOUT">{t("admin.logout")}</SelectItem>
                  <SelectItem value="ORDER_CREATE">{t("admin.orderCreate")}</SelectItem>
                  <SelectItem value="ORDER_UPDATE">{t("admin.orderUpdate")}</SelectItem>
                  <SelectItem value="ORDER_DELETE">{t("admin.orderDelete")}</SelectItem>
                  <SelectItem value="ALERT_RESOLVE">{t("admin.alertResolve")}</SelectItem>
                  <SelectItem value="USER_CREATE">{t("admin.userCreate")}</SelectItem>
                  <SelectItem value="USER_DELETE">{t("admin.userDelete")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.entityType")}</label>
              <Select value={filters.entityType || "all"} onValueChange={(value) => handleFilterChange("entityType", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allTypes")}</SelectItem>
                  <SelectItem value="user">{t("admin.user")}</SelectItem>
                  <SelectItem value="order">{t("admin.order")}</SelectItem>
                  <SelectItem value="alert">{t("admin.alert")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.limit")}</label>
              <Select value={filters.limit} onValueChange={(value) => handleFilterChange("limit", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.timestamp")}</TableHead>
                <TableHead>{t("admin.userId")}</TableHead>
                <TableHead>{t("admin.action")}</TableHead>
                <TableHead>{t("admin.entityType")}</TableHead>
                <TableHead>{t("admin.entityId")}</TableHead>
                <TableHead>{t("admin.ipAddress")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              ) : data?.items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {t("admin.noAuditLogsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                data?.items?.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.userId || t("admin.system")}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell>{log.entityId || "-"}</TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > parseInt(filters.limit) && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {t("admin.showingEntries", {
              start: parseInt(filters.offset) + 1,
              end: Math.min(parseInt(filters.offset) + parseInt(filters.limit), data.total),
              total: data.total
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={parseInt(filters.offset) === 0}
              onClick={() =>
                setFilters(prev => ({
                  ...prev,
                  offset: Math.max(0, parseInt(prev.offset) - parseInt(prev.limit)).toString(),
                }))
              }
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={parseInt(filters.offset) + parseInt(filters.limit) >= data.total}
              onClick={() =>
                setFilters(prev => ({
                  ...prev,
                  offset: (parseInt(prev.offset) + parseInt(prev.limit)).toString(),
                }))
              }
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}