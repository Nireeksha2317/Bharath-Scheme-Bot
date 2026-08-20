import { Link, useLocation } from "wouter";
import { Home, List, MessageSquareText, FileText } from "lucide-react";
import { clsx } from "clsx";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: MessageSquareText, label: "Chat Bot" },
    { href: "/schemes", icon: List, label: "All Schemes" },
    { href: "/dashboard", icon: FileText, label: "Digital Locker" },
    { href: "/admin", icon: Home, label: "Admin" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border md:relative md:border-t-0 md:bg-transparent md:backdrop-blur-none">
      <div className="flex items-center justify-around md:justify-start md:gap-2 p-2 md:p-0">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="w-full md:w-auto">
              <div 
                className={clsx(
                  "flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer select-none",
                  isActive 
                    ? "text-primary bg-primary/10 md:bg-white md:shadow-sm md:border md:border-border/50 font-semibold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={clsx("w-6 h-6 md:w-5 md:h-5", isActive && "fill-current opacity-20")} />
                <span className="text-[10px] md:text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
