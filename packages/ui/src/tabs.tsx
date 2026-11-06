import * as TabsPrimitive from '@radix-ui/react-tabs'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'

export const TabsRoot = TabsPrimitive.Root
export const TabsList = TabsPrimitive.List
export const TabsContent = TabsPrimitive.Content

export const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => <TabsPrimitive.Trigger {...props} ref={ref} className={[
    'min-h-11 cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-4 py-2 font-ui-body text-base font-semibold text-ui-muted data-[state=active]:border-ui-primary data-[state=active]:text-ui-primary focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:-outline-offset-3',
    className,
  ].filter(Boolean).join(' ')} />,
)
TabsTrigger.displayName = 'TabsTrigger'
