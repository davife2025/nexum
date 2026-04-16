export default function RootLoading() {
  return (
    <div style={{ background: "#0F172A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, color: "#00E5C9", marginBottom: 14, animation: "spin 2s linear infinite", display: "inline-block" }}>◈</div>
        <div style={{ fontSize: 12, color: "#4A7090", letterSpacing: ".12em" }}>LOADING</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
