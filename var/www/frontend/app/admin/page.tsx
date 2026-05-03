"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Tab components loaded lazily to reduce initial bundle
const TimelineTab  = dynamic(() => import("./tabs/TimelineTab"));
const AnalyticsTab = dynamic(() => import("./tabs/AnalyticsTab"));
const ArtistsTab   = dynamic(() => import("./tabs/ArtistsTab"));
const MusicTab     = dynamic(() => import("./tabs/MusicTab"));
const PlaylistsTab = dynamic(() => import("./tabs/PlaylistsTab"));
const RadioTab     = dynamic(() => import("./tabs/RadioTab"));
const AuditTab     = dynamic(() => import("./tabs/AuditTab"));
const VstTab       = dynamic(() => import("./tabs/VstTab"));

type Section = "timeline" | "analytics" | "artists" | "music" | "playlists" | "radio" | "audit" | "vst";

interface AuthUser { logged_in: boolean; user_id: string; role: string; artist_id?: string }

const NAV_ITEMS: { id: Section; icon: string; label: string; adminOnly?: boolean }[] = [
  { id: "timeline",  icon: "fa-stream",     label: "Timeline" },
  { id: "analytics", icon: "fa-chart-line", label: "Analytics" },
  { id: "artists",   icon: "fa-users",      label: "Artistes" },
  { id: "music",     icon: "fa-music",      label: "Musique",   adminOnly: true },
  { id: "playlists", icon: "fa-list-ol",    label: "Playlists", adminOnly: true },
  { id: "radio",     icon: "fa-broadcast-tower", label: "Radio", adminOnly: true },
  { id: "audit",     icon: "fa-clipboard-list",  label: "Audit",  adminOnly: true },
  { id: "vst",       icon: "fa-plug",            label: "VST",    adminOnly: true },
];

export const dynamic_ = "force-dynamic"; // prevent static generation for admin page

export default function AdminPage() {
  const [section, setSection]         = useState<Section>("timeline");
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth check on mount
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data: AuthUser) => {
        if (!data.logged_in) { window.location.href = "/login"; return; }
        setUser(data);
        setAuthChecked(true);
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  function logout() { window.location.href = "/api/auth/logout"; }

  function navigate(s: Section) {
    setSection(s);
    setSidebarOpen(false);
  }

  if (!authChecked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--surface-bg, #0a0a0a)" }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Chargement...</span>
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter((n) => !n.adminOnly || user?.role === "admin");
  const displayName = user?.artist_id ?? user?.user_id ?? "Utilisateur";
  const roleLabel = user?.role === "admin" ? "Administrateur" : user?.role === "artist" ? "Artiste" : user?.role ?? "-";

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      {/* Mobile toggle */}
      <button
        className="mobile-menu-toggle"
        id="mobileMenuToggle"
        aria-label="Toggle menu"
        onClick={() => setSidebarOpen((o) => !o)}
      >
        <i className={`fas ${sidebarOpen ? "fa-times" : "fa-bars"}`}></i>
      </button>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <nav className={`admin-sidebar${sidebarOpen ? " open" : ""}`} id="adminSidebar">
        <div className="sidebar-header">GMZ ADMIN</div>
        <div className="sidebar-nav">
          <ul>
            {visibleNav.map((item) => (
              <li key={item.id}>
                <a
                  href="#"
                  className={`nav-link${section === item.id ? " active" : ""}`}
                  onClick={(e) => { e.preventDefault(); navigate(item.id); }}
                >
                  <i className={`fas ${item.icon}`}></i> {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </div>
          <button className="btn btn-danger" style={{ width: "100%" }} onClick={logout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="admin-main-content">
        {section === "timeline"  && <TimelineTab />}
        {section === "analytics" && <AnalyticsTab />}
        {section === "artists"   && <ArtistsTab />}
        {section === "music"     && <MusicTab />}
        {section === "playlists" && <PlaylistsTab />}
        {section === "radio"     && <RadioTab />}
        {section === "audit"     && <AuditTab />}
        {section === "vst"       && <VstTab />}
      </main>
    </div>
  );
}
