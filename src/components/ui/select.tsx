import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps {
  value: string | number | null
  onChange: (value: string | number) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder = "Select...", className }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((opt) => opt.value === value)?.label

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300 focus:border-primary focus:text-primary outline-none transition-all cursor-pointer shadow-sm group",
          isOpen && "border-primary text-primary"
        )}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown
          size={14}
          className={cn(
            "text-zinc-600 group-hover:text-primary transition-transform duration-300",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-left transition-colors",
                  value === option.value
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check size={12} className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
