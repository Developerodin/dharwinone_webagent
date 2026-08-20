/**
 * Step indicator: the active step is an elongated pill, the rest are dots.
 */
export function ProgressDots({
  total,
  active,
}: {
  total: number;
  active: number;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={active}
      aria-label={`Step ${active} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => {
        const isActive = index + 1 === active;
        return (
          <span
            key={index}
            className={`h-[6px] rounded-full transition-all duration-300 ${
              isActive ? "w-[22px] bg-white" : "w-[6px] bg-white/25"
            }`}
          />
        );
      })}
    </div>
  );
}
