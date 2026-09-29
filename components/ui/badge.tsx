import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "font-body inline-flex items-center gap-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-1",
  {
    variants: {
      variant: {
        acento: "bg-dorado-uf text-tinta-azul",
        neutro: "bg-niebla/60 text-pizarra-media",
        exito: "bg-verde-aprobado/10 text-verde-aprobado",
        error: "bg-rojo-terracota/10 text-rojo-terracota",
        aviso: "bg-ambar-aviso/10 text-ambar-aviso",
      },
    },
    defaultVariants: { variant: "neutro" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
