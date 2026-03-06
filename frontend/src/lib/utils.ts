import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names into a single string using clsx and tailwind-merge.
 * 
 * This utility function merges Tailwind CSS classes, handling conflicts by applying
 * the last defined class (e.g., "px-2 px-4" results in "px-4"). It also supports
 * conditional classes and object syntax via clsx.
 * 
 * @param inputs - Class values to be combined (strings, arrays, objects, conditionals)
 * @returns Merged class string with Tailwind conflicts resolved
 * 
 * @example
 * // Basic usage
 * cn("px-4 py-2", "bg-blue-500") // => "px-4 py-2 bg-blue-500"
 * 
 * // Conditional classes
 * cn("px-4", isActive && "bg-blue-500") // => "px-4 bg-blue-500" or "px-4"
 * 
 * // Object syntax
 * cn({ "text-red-500": isError, "text-green-500": isSuccess })
 * 
 * // Tailwind conflict resolution
 * cn("px-2 py-1", "px-4") // => "py-1 px-4" (px-4 overrides px-2)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
