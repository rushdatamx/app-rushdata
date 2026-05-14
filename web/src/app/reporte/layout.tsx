/**
 * Layout dedicado para /reporte.
 *
 * El layout raíz (web/src/app/layout.tsx) envuelve cada página con sidebar
 * y topbar. Aquí necesitamos vista limpia print-friendly: nada de chrome.
 *
 * En Next 16 App Router, este segmento layout NO reemplaza el root layout
 * (eso requeriría route groups). Lo que sí podemos hacer es esconder
 * sidebar/topbar vía CSS print + un wrapper que ocupe todo el ancho.
 *
 * El CSS @media print en globals.css se encarga de ocultar el shell al
 * imprimir.
 */
export default function ReporteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="reporte-shell -mx-6 -my-6 lg:-mx-8 lg:-my-8 px-6 py-6 lg:px-8 lg:py-8 print:p-0 print:m-0">
      {children}
    </div>
  );
}
