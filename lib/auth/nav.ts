import { can, type Capability, type Role } from "@/lib/auth/permissions";

/** lucide-react icon names used by the sidebar; kept as strings so this module stays pure. */
export type LucideIconName =
  | "LayoutDashboard"
  | "ShieldCheck"
  | "Users"
  | "UserPlus"
  | "FolderOpen"
  | "FolderPlus"
  | "CheckSquare"
  | "FileBadge"
  | "BarChart3"
  | "ShieldAlert"
  | "ScrollText"
  | "UserCog"
  | "School"
  | "MessageSquare"
  | "BookOpen";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIconName;
  cap?: Capability;
};

// Fixed display order; routes from SPEC section 9.
const ITEMS: readonly NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: "LayoutDashboard" },
  { href: "/verify", labelKey: "nav.verify", icon: "ShieldCheck", cap: "students.verify" },
  { href: "/students", labelKey: "nav.students", icon: "Users", cap: "lists.view" },
  { href: "/students/new", labelKey: "nav.studentsNew", icon: "UserPlus", cap: "students.create" },
  { href: "/cases", labelKey: "nav.cases", icon: "FolderOpen", cap: "lists.view" },
  { href: "/cases/new", labelKey: "nav.casesNew", icon: "FolderPlus", cap: "cases.create" },
  { href: "/approvals", labelKey: "nav.approvals", icon: "CheckSquare", cap: "deletion.decide" },
  { href: "/clearance", labelKey: "nav.clearance", icon: "FileBadge", cap: "clearance.issue" },
  { href: "/reports", labelKey: "nav.reports", icon: "BarChart3", cap: "reports.export" },
  { href: "/security", labelKey: "nav.security", icon: "ShieldAlert", cap: "security.view" },
  { href: "/audit", labelKey: "nav.audit", icon: "ScrollText", cap: "audit.view" },
  { href: "/admin/users", labelKey: "nav.adminUsers", icon: "UserCog", cap: "users.manage" },
  { href: "/admin/classes", labelKey: "nav.adminClasses", icon: "School", cap: "users.manage" },
  { href: "/feedback", labelKey: "nav.feedback", icon: "MessageSquare", cap: "feedback.submit" },
  { href: "/sop", labelKey: "nav.sop", icon: "BookOpen" },
];

/** Sidebar items for a role, in fixed order, filtered by the capability matrix. */
export function navFor(role: Role): NavItem[] {
  return ITEMS.filter((item) => item.cap === undefined || can(role, item.cap));
}
