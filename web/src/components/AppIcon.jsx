// src/components/AppIcon.jsx
import * as Icons from 'lucide-react'
import { cn } from '../utils/cn'

export default function Icon({ name, size = 16, className, ...props }) {
  const Lucide = Icons[name] || Icons.HelpCircle
  return (
    <Lucide
      width={size}
      height={size}
      className={cn('bg-transparent fill-none stroke-current [&_*]:fill-none', className)}
      {...props}
    />
  )
}
