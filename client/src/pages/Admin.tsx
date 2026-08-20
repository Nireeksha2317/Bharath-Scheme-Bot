import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Users, Bookmark, FileText } from "lucide-react";

export default function Admin() {
  const { data: metrics, isLoading, error } = useQuery<{totalUsers: number, totalApplications: number, totalSavedSchemes: number}>({
    queryKey: ["/api/admin/metrics"],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <header className="bg-primary/5 border-b border-primary/10 px-4 py-4 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="p-2 -ml-2 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </div>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Admin Dashboard
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Metrics</h2>
          <p className="text-gray-500 mt-1">Live overview of platform usage</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            Failed to load metrics. Please try again later.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Users"
              value={metrics?.totalUsers || 0}
              icon={<Users className="w-6 h-6 text-blue-500" />}
              colorClass="bg-blue-50"
            />
            <MetricCard
              title="Active Applications"
              value={metrics?.totalApplications || 0}
              icon={<FileText className="w-6 h-6 text-green-500" />}
              colorClass="bg-green-50"
            />
            <MetricCard
              title="Saved Schemes"
              value={metrics?.totalSavedSchemes || 0}
              icon={<Bookmark className="w-6 h-6 text-amber-500" />}
              colorClass="bg-amber-50"
            />
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ title, value, icon, colorClass }: { title: string, value: number, icon: React.ReactNode, colorClass: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colorClass} dark:bg-gray-700`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
}
