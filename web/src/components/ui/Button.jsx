// src/components/ui/Button.jsx
import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import Icon from '../AppIcon'

const buttonVariants = cva('inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transform-gpu will-change-transform transition-[background-color,color,border,box-shadow,transform] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98]', {
  variants: {
    variant: {
      default: 'bg-brand-primary text-white hover:bg-brand-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white',
      secondary: 'bg-brand-accent text-white hover:bg-brand-accent/90',
      ghost: 'hover:bg-brand-primary/10 hover:text-brand-primary',
      link: 'text-brand-primary underline-offset-4 hover:underline',
      success: 'bg-success text-success-foreground hover:bg-success/90',
      warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
      danger: 'bg-error text-error-foreground hover:bg-error/90',
      glass: 'text-foreground hover:text-foreground/90'
    },
    size: { default: 'h-10 px-4 py-2', sm: 'h-9 rounded-md px-3', lg: 'h-11 rounded-md px-8', icon: 'h-10 w-10', xs: 'h-8 rounded-md px-2 text-xs', xl: 'h-12 rounded-md px-10 text-base' }
  },
  defaultVariants: { variant: 'default', size: 'default' }
})

const Button = React.forwardRef(({ className, variant, size, asChild = false, children, loading = false, iconName = null, iconPosition = 'left', iconSize = null, fullWidth = false, disabled = false, glass = false, glassActive = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  const iconSizeMap = { xs: 12, sm: 14, default: 16, lg: 18, xl: 20, icon: 16 }
  const calculatedIconSize = iconSize || iconSizeMap?.[size] || 16

  const LoadingSpinner = () => (<svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>)
  const renderIcon = () => iconName ? <Icon name={iconName} size={calculatedIconSize} className={cn('[fill:none] stroke-current [&_*]:[fill:none]', children && iconPosition === 'left' && 'mr-2', children && iconPosition === 'right' && 'ml-2')} /> : null

  const isGlass = glass || variant === 'glass'
  const glassOnClasses = 'bg-white/28 dark:bg-brand-primary/20 backdrop-blur-xl supports-[backdrop-filter]:bg-white/28 supports-[backdrop-filter]:dark:bg-brand-primary/20 border border-brand-primary/20 dark:border-brand-primary/30 shadow-sm hover:bg-white/35 dark:hover:bg-brand-primary/30'
  const glassOffClasses = 'bg-transparent border border-transparent shadow-none'
  const baseClasses = buttonVariants({ variant: isGlass ? 'glass' : variant, size })
  const finalClasses = cn(baseClasses, fullWidth && 'w-full', isGlass && (glassActive ? glassOnClasses : glassOffClasses), className)

  const content = (<>{loading && <LoadingSpinner />}{iconName && iconPosition === 'left' && renderIcon()}{children}{iconName && iconPosition === 'right' && renderIcon()}</>)

  if (asChild) {
    try { const child = React.Children.only(children); if (!React.isValidElement(child)) throw new Error('invalid child'); return React.cloneElement(child, { className: cn(finalClasses, child.props.className), disabled: disabled || loading || child.props.disabled, children: content }) }
    catch { return <button className={finalClasses} ref={ref} disabled={disabled || loading} {...props}>{content}</button> }
  }
  return <Comp className={finalClasses} ref={ref} disabled={disabled || loading} {...props}>{content}</Comp>
})

Button.displayName = 'Button'
export default Button
