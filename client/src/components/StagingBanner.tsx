// Visible marker so no one mistakes the staging deployment for production.
// Renders only when the build sets VITE_APP_ENV=staging.
export function StagingBanner() {
  if (import.meta.env.VITE_APP_ENV !== "staging") return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#b91c1c",
        color: "#ffffff",
        textAlign: "center",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        padding: "4px 8px",
      }}
    >
      STAGING — test data only · no live customers, payments, or emails
    </div>
  );
}
