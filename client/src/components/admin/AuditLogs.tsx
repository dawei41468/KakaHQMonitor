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
import { Download, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress: string;
  timestamp: string;
  oldValues?: any;
  newValues?: any;
  changesDiff?: any;
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
        <p className="text-red-500">Error loading audit logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="User ID"
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={filters.action || "all"} onValueChange={(value) => handleFilterChange("action", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="ORDER_CREATE">Order Create</SelectItem>
                  <SelectItem value="ORDER_UPDATE">Order Update</SelectItem>
                  <SelectItem value="ORDER_DELETE">Order Delete</SelectItem>
                  <SelectItem value="ALERT_RESOLVE">Alert Resolve</SelectItem>
                  <SelectItem value="USER_CREATE">User Create</SelectItem>
                  <SelectItem value="USER_DELETE">User Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Entity Type</label>
              <Select value={filters.entityType || "all"} onValueChange={(value) => handleFilterChange("entityType", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Limit</label>
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
                <TableHead>Timestamp</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                data?.items?.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.userId || "System"}</TableCell>
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
            Showing {parseInt(filters.offset) + 1} to{" "}
            {Math.min(parseInt(filters.offset) + parseInt(filters.limit), data.total)} of{" "}
            {data.total} entries
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
              Previous
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
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}