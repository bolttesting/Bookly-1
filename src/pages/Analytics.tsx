import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalytics, DateRangeFilter } from '@/hooks/useAnalytics';
import { format } from 'date-fns';
import { CalendarIcon, Download, BarChart3, Users, Briefcase, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RevenueReportSection } from '@/components/analytics/RevenueReportSection';
import { CustomerAnalyticsSection } from '@/components/analytics/CustomerAnalyticsSection';
import { ServicePerformanceSection } from '@/components/analytics/ServicePerformanceSection';
import { StaffPerformanceSection } from '@/components/analytics/StaffPerformanceSection';
import { exportAnalyticsToCSV, exportAnalyticsToPDF } from '@/lib/analytics-export';

export default function Analytics() {
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>({ type: 'month' });
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const { revenueReport, customerAnalytics, servicePerformance, staffPerformance, loading, dateRange } = useAnalytics(dateFilter);

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setDateFilter({ type: 'custom', startDate: customStartDate, endDate: customEndDate });
    } else {
      setDateFilter({ type: value as DateRangeFilter['type'] });
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setDateFilter({ type: 'custom', startDate: customStartDate, endDate: customEndDate });
    }
  };

  const handleExportCSV = () => {
    if (revenueReport && customerAnalytics && servicePerformance && staffPerformance) {
      exportAnalyticsToCSV({
        revenueReport,
        customerAnalytics,
        servicePerformance,
        staffPerformance,
        dateRange,
      });
    }
  };

  const handleExportPDF = async () => {
    if (revenueReport && customerAnalytics && servicePerformance && staffPerformance) {
      await exportAnalyticsToPDF({
        revenueReport,
        customerAnalytics,
        servicePerformance,
        staffPerformance,
        dateRange,
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Comprehensive insights into your business performance
          </p>
        </div>

        {/* Date Range Filter and Export */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Date Range Selector */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={dateFilter.type} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter.type === 'custom' && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[180px] justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[180px] justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button onClick={handleCustomDateApply} size="sm" className="w-full sm:w-auto">
                  Apply
                </Button>
              </>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={loading}
              className="flex-1 sm:flex-initial"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={loading}
              className="flex-1 sm:flex-initial"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Display */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Showing data from{' '}
            <span className="font-medium text-foreground">
              {format(dateRange.start, 'PPP')}
            </span>{' '}
            to{' '}
            <span className="font-medium text-foreground">
              {format(dateRange.end, 'PPP')}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="revenue" className="flex items-center gap-2 py-2 sm:py-3">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
            <span className="sm:hidden">Rev</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2 py-2 sm:py-3">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
            <span className="sm:hidden">Cust</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2 py-2 sm:py-3">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Services</span>
            <span className="sm:hidden">Svc</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2 py-2 sm:py-3">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Staff</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4 sm:mt-6">
          <RevenueReportSection data={revenueReport} loading={loading} />
        </TabsContent>

        <TabsContent value="customers" className="mt-4 sm:mt-6">
          <CustomerAnalyticsSection data={customerAnalytics} loading={loading} />
        </TabsContent>

        <TabsContent value="services" className="mt-4 sm:mt-6">
          <ServicePerformanceSection data={servicePerformance} loading={loading} />
        </TabsContent>

        <TabsContent value="staff" className="mt-4 sm:mt-6">
          <StaffPerformanceSection data={staffPerformance} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

