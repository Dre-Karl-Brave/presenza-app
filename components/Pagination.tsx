import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 mt-3 text-[12px] text-muted-foreground px-[18px] py-2 border-t border-border">
      <span className="font-mono">
        {first}–{last} of {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[12px] rounded-[5px]"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[12px] rounded-[5px]"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
