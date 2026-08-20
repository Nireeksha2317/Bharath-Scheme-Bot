import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { SchemeCard } from "@/components/SchemeCard";
import { useSavedSchemes, useApplications } from "@/hooks/use-dashboard";
import { BookmarkCheck, FileText, CheckCircle2, Clock } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"saved" | "applications">("saved");
  const { data: savedSchemes, isLoading: loadingSaved } = useSavedSchemes();
  const { data: applications, isLoading: loadingApps } = useApplications();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-foreground">Digital Locker</h1>
          <div className="hidden md:block">
            <Navigation />
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col md:flex-row gap-6 mb-20 md:mb-0">
        <section className="flex-1 bg-white rounded-3xl p-4 md:p-8 shadow-sm border border-border/50">
          <div className="flex flex-col gap-4 mb-8">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">My Digital Locker</h1>
            <p className="text-muted-foreground">Manage your saved schemes and track your applications.</p>
          </div>

          <div className="flex gap-4 border-b border-border mb-6">
            <button
              onClick={() => setActiveTab("saved")}
              className={`pb-3 font-medium transition-colors relative ${
                activeTab === "saved" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Saved Schemes
              {activeTab === "saved" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`pb-3 font-medium transition-colors relative ${
                activeTab === "applications" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Applications
              {activeTab === "applications" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </div>

          {activeTab === "saved" && (
            <div className="space-y-6">
              {loadingSaved ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : savedSchemes?.length ? (
                savedSchemes.map(({ scheme }) => (
                  <SchemeCard key={scheme.id} scheme={scheme} />
                ))
              ) : (
                <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-xl">
                  <BookmarkCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No saved schemes</h3>
                  <p className="text-muted-foreground">Schemes you bookmark will appear here.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="space-y-6">
              {loadingApps ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : applications?.length ? (
                applications.map(({ app, scheme }) => (
                  <div key={app.id} className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{scheme.name}</h3>
                        <p className="text-sm text-muted-foreground">Applied on: {app.applicationDate ? new Date(app.applicationDate).toLocaleDateString() : 'Just now'}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {app.status === 'Approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {app.status}
                      </span>
                    </div>

                    <div className="bg-secondary/20 rounded-lg p-4 mt-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Required Documents Checklist
                      </h4>
                      <div className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                        {scheme.documents}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-xl">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No applications yet</h3>
                  <p className="text-muted-foreground">When you apply for a scheme, you can track it here.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <div className="md:hidden">
        <Navigation />
      </div>
    </div>
  );
}
