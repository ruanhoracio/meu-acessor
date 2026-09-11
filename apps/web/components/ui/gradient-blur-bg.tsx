import { cn } from "@/lib/utils";

/**
 * Fundo de página: grade fina + brilho difuso num canto.
 *
 * Adaptado do "gradient-blur-bg" (21st.dev) para os tokens do nosso design
 * system — linhas em navy a 6% em vez de cinza chapado, e o brilho em
 * azul-navy em vez de lilás. Vai como primeira filha de um container
 * `relative`; o conteúdo por cima precisa de `relative z-10`.
 */
export function GradientBlurBg({
  lado = "direita",
  className,
}: {
  lado?: "direita" | "esquerda";
  className?: string;
}) {
  const x = lado === "direita" ? "100%" : "0%";
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      style={{
        backgroundImage: `
          linear-gradient(to right, var(--via-navy-06) 1px, transparent 1px),
          linear-gradient(to bottom, var(--via-navy-06) 1px, transparent 1px),
          radial-gradient(circle 800px at ${x} 200px, rgba(30, 58, 95, 0.18), transparent)
        `,
        backgroundSize: "96px 64px, 96px 64px, 100% 100%",
      }}
    />
  );
}
