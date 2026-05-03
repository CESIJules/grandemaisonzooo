import Script from "next/script";
import adminBodyHTML from "./adminBodyHTML";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh", width: "100%" }} dangerouslySetInnerHTML={{ __html: adminBodyHTML }} />
      <div style={{ display: "none" }}>
        <div id="admin-timeline"></div>
      </div>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="beforeInteractive"
      />
      <Script src="/admin.js" strategy="afterInteractive" />
    </>
  );
}
