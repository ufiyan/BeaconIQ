export default function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-white">{title}</h1>
        {description && (
          <p className="text-[13px] mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}