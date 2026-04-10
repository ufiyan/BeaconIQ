export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.1)" }}>
          <Icon className="h-7 w-7" style={{ color: "#3B82F6" }} />
        </div>
      )}
      <h3 className="text-sm font-medium text-white">{title}</h3>
      {description && <p className="text-xs mt-1 max-w-sm" style={{ color: "#94A3B8" }}>{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}