import * as React from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  containerClassName?: string
  onClear?: () => void
}

export function SearchInput({
  className,
  containerClassName,
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  ...props
}: SearchInputProps) {
  const hasValue = value !== undefined && value !== null && value !== ""

  const handleClear = () => {
    if (onClear) {
      onClear()
    } else if (onChange) {
      const syntheticEvent = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }
  }

  return (
    <div
      data-slot="search-input-container"
      className={cn("relative w-full", containerClassName)}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "pl-9",
          hasValue && (onClear || onChange) ? "pr-9" : "",
          className
        )}
        {...props}
      />
      {hasValue && (onClear || onChange) && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
