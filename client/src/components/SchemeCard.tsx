import { useState } from "react";
import { type Scheme } from "@shared/routes";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ExternalLink, 
  GraduationCap, 
  Tractor, 
  Heart, 
  Briefcase, 
  Users,
  Building2,
  FileText,
  Download,
  Bookmark,
  BookmarkCheck
} from "lucide-react";
import { generateSchemePDF } from "@/lib/export-pdf";
import { 
  useSavedSchemes, 
  useSaveScheme, 
  useRemoveSavedScheme, 
  useCreateApplication,
  useApplications
} from "@/hooks/use-dashboard";

interface SchemeCardProps {
  scheme: Scheme;
}

export function SchemeCard({ scheme }: SchemeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: savedSchemes } = useSavedSchemes();
  const { data: applications } = useApplications();
  const { mutate: saveScheme, isPending: saving } = useSaveScheme();
  const { mutate: removeSavedScheme, isPending: removing } = useRemoveSavedScheme();
  const { mutate: createApplication, isPending: applying } = useCreateApplication();

  const isSaved = savedSchemes?.some(s => s.scheme.id === scheme.id);
  const isApplied = applications?.some(a => a.scheme.id === scheme.id);

  const toggleSave = () => {
    if (isSaved) {
      removeSavedScheme(scheme.id);
    } else {
      saveScheme(scheme.id);
    }
  };

  const handleApply = () => {
    if (!isApplied) {
      createApplication(scheme.id);
    }
    if (scheme.officialLink) {
      window.open(scheme.officialLink, '_blank');
    }
  };

  const getIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("farmer") || c.includes("agri")) return <Tractor className="w-5 h-5 text-green-600" />;
    if (c.includes("student") || c.includes("education")) return <GraduationCap className="w-5 h-5 text-blue-600" />;
    if (c.includes("health")) return <Heart className="w-5 h-5 text-red-600" />;
    if (c.includes("women") || c.includes("child")) return <Users className="w-5 h-5 text-pink-600" />;
    if (c.includes("business") || c.includes("employment")) return <Briefcase className="w-5 h-5 text-purple-600" />;
    return <Building2 className="w-5 h-5 text-gray-600" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Header */}
      <div className="p-4 md:p-5 flex items-start justify-between gap-4 bg-gradient-to-br from-white to-gray-50/50">
        <div className="flex gap-4">
          <div className="mt-1 p-2 bg-secondary/30 rounded-lg shrink-0">
            {getIcon(scheme.category)}
          </div>
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                {scheme.category}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                {scheme.state}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground leading-tight">{scheme.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{scheme.description}</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="px-4 py-3 bg-gray-50 border-t border-border/50 flex items-center justify-between">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {expanded ? "Hide Details" : "View Details"}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleSave}
            disabled={saving || removing}
            className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
              isSaved ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:bg-gray-200'
            }`}
            title={isSaved ? "Remove Bookmark" : "Bookmark Scheme"}
          >
            {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => generateSchemePDF(scheme)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg shadow-sm hover:bg-secondary/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download Scheme Details as PDF"
          >
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save PDF</span>
          </button>
          
          <button 
            onClick={handleApply}
            disabled={applying}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg shadow-sm transition-all ${
              isApplied 
                ? 'bg-green-100 text-green-800 cursor-default' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isApplied ? "Applied" : "Apply Now"} {!isApplied && <ExternalLink className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white"
          >
            <div className="p-5 pt-2 space-y-4 text-sm border-t border-border/50">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Beneficiaries
                  </h4>
                  <p className="text-muted-foreground pl-6">{scheme.beneficiaries}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Documents Required
                  </h4>
                  <p className="text-muted-foreground pl-6">{scheme.documents}</p>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <h4 className="font-semibold text-foreground">Benefits</h4>
                <p className="text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-secondary/30">
                  {scheme.benefits}
                </p>
              </div>

              <div className="space-y-1 pt-2">
                <h4 className="font-semibold text-foreground">Eligibility</h4>
                <p className="text-muted-foreground">{scheme.eligibility}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
