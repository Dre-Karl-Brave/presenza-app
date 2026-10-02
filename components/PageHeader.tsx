/* Page-level description shown below the TopBar when needed */
export function PageHeader({ description }: { description?: string }) {
  if (!description) return null;
  return (
    <p className="text-[13px] text-muted-foreground -mt-2">{description}</p>
  );
}
