export default function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="font-medium text-white" style={{ fontSize: "18px" }}>{title}</h1>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}