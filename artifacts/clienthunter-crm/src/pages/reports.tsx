import { MainLayout } from "@/components/layout/main-layout";
import { 
  useGetConversionReport,
  useGetReportByIndustry,
  useGetReportByCountry,
  useGetWeeklyLeadsReport,
  getGetConversionReportQueryKey,
  getGetReportByIndustryQueryKey,
  getGetReportByCountryQueryKey,
  getGetWeeklyLeadsReportQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Reports() {
  const { data: conversion, isLoading: loadingConv } = useGetConversionReport({ query: { queryKey: getGetConversionReportQueryKey() } });
  const { data: byIndustry, isLoading: loadingInd } = useGetReportByIndustry({ query: { queryKey: getGetReportByIndustryQueryKey() } });
  const { data: byCountry, isLoading: loadingCountry } = useGetReportByCountry({ query: { queryKey: getGetReportByCountryQueryKey() } });
  const { data: weekly, isLoading: loadingWeekly } = useGetWeeklyLeadsReport({ query: { queryKey: getGetWeeklyLeadsReportQueryKey() } });

  const pieData = conversion ? [
    { name: 'Won', value: conversion.won },
    { name: 'Lost', value: conversion.lost },
    { name: 'In Progress', value: conversion.inProgress }
  ] : [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your agency's performance metrics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConv ? <Skeleton className="h-12 w-24" /> : (
                <div className="text-5xl font-black text-primary">
                  {conversion?.conversionRate.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pipeline Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConv ? <Skeleton className="h-12 w-24" /> : (
                <div className="text-5xl font-black">
                  {conversion ? conversion.won + conversion.inProgress : 0}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lost Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConv ? <Skeleton className="h-12 w-24" /> : (
                <div className="text-5xl font-black text-destructive">
                  {conversion?.lost || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Velocity</CardTitle>
              <CardDescription>New leads added per week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loadingWeekly ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weekly || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Breakdown</CardTitle>
              <CardDescription>Overall status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loadingConv ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.name === 'Won' ? 'hsl(var(--chart-2))' : 
                            entry.name === 'Lost' ? 'hsl(var(--destructive))' : 
                            'hsl(var(--primary))'
                          } />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By Industry</CardTitle>
              <CardDescription>Lead concentration by vertical</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loadingInd ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byIndustry || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By Geography</CardTitle>
              <CardDescription>Top countries for your leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loadingCountry ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCountry || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
