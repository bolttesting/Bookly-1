import { RevenueReport, CustomerAnalytics, ServicePerformance, StaffPerformance } from '@/hooks/useAnalytics';
import { format } from 'date-fns';
import { formatCurrencySimple } from './currency';

interface ExportData {
  revenueReport: RevenueReport;
  customerAnalytics: CustomerAnalytics;
  servicePerformance: ServicePerformance;
  staffPerformance: StaffPerformance;
  dateRange: { start: Date; end: Date };
}

export function exportAnalyticsToCSV(data: ExportData) {
  const { revenueReport, customerAnalytics, servicePerformance, staffPerformance, dateRange } = data;

  // Create CSV content
  let csvContent = 'Bookly Analytics Report\n';
  csvContent += `Generated: ${format(new Date(), 'PPP p')}\n`;
  csvContent += `Period: ${format(dateRange.start, 'PPP')} to ${format(dateRange.end, 'PPP')}\n\n`;

  // Revenue Report Section
  csvContent += '=== REVENUE REPORT ===\n';
  csvContent += `Total Revenue,${revenueReport.totalRevenue}\n`;
  csvContent += `Total Appointments,${revenueReport.totalAppointments}\n`;
  csvContent += `Completed Appointments,${revenueReport.completedAppointments}\n`;
  csvContent += `Cancelled Appointments,${revenueReport.cancelledAppointments}\n`;
  csvContent += `Average Revenue per Appointment,${revenueReport.averageRevenuePerAppointment}\n\n`;

  csvContent += 'Revenue by Day\n';
  csvContent += 'Date,Revenue,Appointments\n';
  revenueReport.revenueByDay.forEach(day => {
    csvContent += `${day.date},${day.revenue},${day.appointments}\n`;
  });
  csvContent += '\n';

  csvContent += 'Revenue by Service\n';
  csvContent += 'Service Name,Revenue,Appointments\n';
  revenueReport.revenueByService.forEach(service => {
    csvContent += `${service.serviceName},${service.revenue},${service.appointments}\n`;
  });
  csvContent += '\n';

  csvContent += 'Revenue by Staff\n';
  csvContent += 'Staff Name,Revenue,Appointments\n';
  revenueReport.revenueByStaff.forEach(staff => {
    csvContent += `${staff.staffName},${staff.revenue},${staff.appointments}\n`;
  });
  csvContent += '\n';

  // Customer Analytics Section
  csvContent += '=== CUSTOMER ANALYTICS ===\n';
  csvContent += `Total Customers,${customerAnalytics.totalCustomers}\n`;
  csvContent += `New Customers,${customerAnalytics.newCustomers}\n`;
  csvContent += `Returning Customers,${customerAnalytics.returningCustomers}\n`;
  csvContent += `Average Lifetime Value,${customerAnalytics.averageLifetimeValue}\n\n`;

  csvContent += 'Top Customers\n';
  csvContent += 'Customer Name,Total Spent,Total Visits,Average Spent,Last Visit\n';
  customerAnalytics.topCustomers.forEach(customer => {
    csvContent += `${customer.customerName},${customer.totalSpent},${customer.totalVisits},${customer.averageSpent},${customer.lastVisit || 'N/A'}\n`;
  });
  csvContent += '\n';

  csvContent += 'Customer Growth\n';
  csvContent += 'Date,New Customers,Total Customers\n';
  customerAnalytics.customerGrowth.forEach(growth => {
    csvContent += `${growth.date},${growth.newCustomers},${growth.totalCustomers}\n`;
  });
  csvContent += '\n';

  // Service Performance Section
  csvContent += '=== SERVICE PERFORMANCE ===\n';
  csvContent += `Total Services,${servicePerformance.totalServices}\n\n`;

  csvContent += 'Most Booked Services\n';
  csvContent += 'Service Name,Bookings,Revenue,Average Price\n';
  servicePerformance.mostBookedServices.forEach(service => {
    csvContent += `${service.serviceName},${service.bookings},${service.revenue},${service.averagePrice}\n`;
  });
  csvContent += '\n';

  csvContent += 'Revenue by Service\n';
  csvContent += 'Service Name,Revenue,Bookings,Percentage\n';
  servicePerformance.revenueByService.forEach(service => {
    csvContent += `${service.serviceName},${service.revenue},${service.bookings},${service.percentage.toFixed(2)}%\n`;
  });
  csvContent += '\n';

  // Staff Performance Section
  csvContent += '=== STAFF PERFORMANCE ===\n';
  csvContent += `Total Staff,${staffPerformance.totalStaff}\n\n`;

  csvContent += 'Staff Performance\n';
  csvContent += 'Staff Name,Total Appointments,Completed Appointments,Revenue,Average Revenue,Completion Rate\n';
  staffPerformance.staffStats.forEach(staff => {
    csvContent += `${staff.staffName},${staff.totalAppointments},${staff.completedAppointments},${staff.revenue},${staff.averageRevenuePerAppointment},${staff.completionRate.toFixed(2)}%\n`;
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `bookly-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportAnalyticsToPDF(data: ExportData) {
  // For PDF export, we'll use a simple approach with window.print() or a library
  // For now, we'll create an HTML page that can be printed as PDF
  
  const { revenueReport, customerAnalytics, servicePerformance, staffPerformance, dateRange } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bookly Analytics Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 { color: #6366f1; margin-bottom: 10px; }
        h2 { color: #8b5cf6; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e4e4e7; padding-bottom: 10px; }
        h3 { color: #18181b; margin-top: 20px; margin-bottom: 10px; }
        .meta { color: #71717a; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e4e4e7; }
        th { background-color: #f4f4f5; font-weight: 600; }
        .stat-box { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #f4f4f5; border-radius: 8px; min-width: 200px; }
        .stat-label { font-size: 12px; color: #71717a; margin-bottom: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #18181b; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Bookly Analytics Report</h1>
      <div class="meta">
        <p><strong>Generated:</strong> ${format(new Date(), 'PPP p')}</p>
        <p><strong>Period:</strong> ${format(dateRange.start, 'PPP')} to ${format(dateRange.end, 'PPP')}</p>
      </div>

      <h2>Revenue Report</h2>
      <div>
        <div class="stat-box">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">$${revenueReport.totalRevenue.toLocaleString()}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Appointments</div>
          <div class="stat-value">${revenueReport.totalAppointments}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Completed</div>
          <div class="stat-value">${revenueReport.completedAppointments}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Avg Revenue/Appointment</div>
          <div class="stat-value">$${revenueReport.averageRevenuePerAppointment.toFixed(2)}</div>
        </div>
      </div>

      <h3>Revenue by Service</h3>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Revenue</th>
            <th>Appointments</th>
          </tr>
        </thead>
        <tbody>
          ${revenueReport.revenueByService.map(s => `
            <tr>
              <td>${s.serviceName}</td>
              <td>$${s.revenue.toLocaleString()}</td>
              <td>${s.appointments}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Customer Analytics</h2>
      <div>
        <div class="stat-box">
          <div class="stat-label">Total Customers</div>
          <div class="stat-value">${customerAnalytics.totalCustomers}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">New Customers</div>
          <div class="stat-value">${customerAnalytics.newCustomers}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Returning Customers</div>
          <div class="stat-value">${customerAnalytics.returningCustomers}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Avg Lifetime Value</div>
          <div class="stat-value">$${customerAnalytics.averageLifetimeValue.toFixed(2)}</div>
        </div>
      </div>

      <h3>Top Customers</h3>
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Total Spent</th>
            <th>Visits</th>
            <th>Avg Spent</th>
          </tr>
        </thead>
        <tbody>
          ${customerAnalytics.topCustomers.map(c => `
            <tr>
              <td>${c.customerName}</td>
              <td>$${c.totalSpent.toLocaleString()}</td>
              <td>${c.totalVisits}</td>
              <td>$${c.averageSpent.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Service Performance</h2>
      <h3>Most Booked Services</h3>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Bookings</th>
            <th>Revenue</th>
            <th>Avg Price</th>
          </tr>
        </thead>
        <tbody>
          ${servicePerformance.mostBookedServices.map(s => `
            <tr>
              <td>${s.serviceName}</td>
              <td>${s.bookings}</td>
              <td>$${s.revenue.toLocaleString()}</td>
              <td>$${s.averagePrice.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Staff Performance</h2>
      <table>
        <thead>
          <tr>
            <th>Staff</th>
            <th>Total Appointments</th>
            <th>Completed</th>
            <th>Revenue</th>
            <th>Completion Rate</th>
          </tr>
        </thead>
        <tbody>
          ${staffPerformance.staffStats.map(s => `
            <tr>
              <td>${s.staffName}</td>
              <td>${s.totalAppointments}</td>
              <td>${s.completedAppointments}</td>
              <td>$${s.revenue.toLocaleString()}</td>
              <td>${Math.round(s.completionRate)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          Print / Save as PDF
        </button>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

