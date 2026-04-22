export default function EmptyState({ icon: Icon, title, description, children, compact }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-10 px-4" : "py-16 px-4"}`}>
      {Icon && (
        <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-secondary border border-border">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-[14px] font-semibold text-white">{title}</h3>
      {description && <p className="text-[12px] mt-1.5 max-w-sm text-muted-foreground leading-relaxed">{description}</p>}
      {children && <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">{children}</div>}
    </div>
  );
}