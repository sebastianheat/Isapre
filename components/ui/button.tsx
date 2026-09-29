import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// Botón base del design system (DESIGN.md, sección 4). shadcn/ui como base,
// customizado con la paleta y radios propios del marketplace — nunca los
// defaults de shadcn sin editar (regla anti-slop de impeccable).
const buttonVariants = cva(
  "font-body inline-flex items-center justify-center gap-2 rounded-control text-[15px] font-bold tracking-[0.01em] transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-azul-cotizacion text-papel-calido px-6 py-3.5 hover:bg-[#154a7c] hover:-translate-y-px hover:shadow-soft",
        secondary:
          "border-[1.5px] border-azul-cotizacion text-azul-cotizacion bg-transparent px-6 py-3 hover:bg-azul-cotizacion/5",
        acento:
          "bg-dorado-uf text-tinta-azul px-6 py-3.5 hover:brightness-105 hover:-translate-y-px hover:shadow-soft",
        whatsapp:
          "bg-verde-whatsapp text-white px-5 py-3 hover:brightness-105",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
  ),
);
Button.displayName = "Button";
