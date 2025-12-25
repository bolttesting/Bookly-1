import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueData {
  name: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const hasData = data.some(d => d.revenue > 0);

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold text-foreground mb-4">Revenue This Week</h3>
      <div className="h-[300px]">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No revenue data yet</p>
              <p className="text-sm mt-1">Complete appointments to see revenue trends</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 17%)" />
              <XAxis dataKey="name" stroke="hsl(240, 5%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(240, 5%, 65%)" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                contentStyle={{ 
                  background: "hsl(240, 10%, 6%)", 
                  border: "1px solid hsl(240, 5%, 17%)", 
                  borderRadius: "8px" 
                }} 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(263, 70%, 58%)" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                strokeWidth={2} 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}