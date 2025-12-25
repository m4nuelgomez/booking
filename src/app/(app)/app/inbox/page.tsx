export default function InboxIndexPage() {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        opacity: 0.7,
        fontFamily: "system-ui",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          Select a conversation
        </div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          Pick one from the left sidebar.
        </div>
      </div>
    </div>
  );
}
