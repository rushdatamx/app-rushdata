# Demo Script — RushData (15 min · Director Comercial)

> **Filosofía:** vender BENEFICIOS, no features. Cada vista = un dolor eliminado + horas ahorradas + pesos que no se pierden. Inspirado en cómo Savio comunica "automatiza tu cobranza".
>
> **Verbo ancla (repetir al inicio, al cierre, y entre actos):**
> **"Toma decisiones en minutos, las que hoy te llevan días."**
>
> **Org demo:** Sazonadores Vence Real (HEB, 62 tiendas, 15 SKUs).
> **URL:** https://app-rushdata.vercel.app

---

## Antes de empezar (2 min de prep)

- [ ] Modo incógnito, sesión iniciada.
- [ ] 5 pestañas abiertas en orden:
  1. `/` (Home)
  2. `/sugeridos`
  3. `/tiendas/<heb-mty-contry-id>`
  4. `/forecast`
  5. `/reporte`
- [ ] Hoja ROI imprimible en mano (`docs/DEMO_ROI_SHEET.md`).
- [ ] Cerrar notificaciones. Hoja en blanco para anotar señales.

---

## Acto 1 — Hook (0:00 – 2:00)

**Pestaña: Home (`/`)**

> **"Quiero proponerte algo. Tu equipo —tu KAM, tu jefe de cuenta, quien sea— hoy toma decisiones de pedido en DÍAS. Bajan reportes, los meten a Excel, comparan, deciden, y para entonces ya pasaron 3 días. ¿Te suena?"**

Pausa. Espera el sí.

> **"RushData hace que esas decisiones se tomen en MINUTOS. La misma decisión, con mejor información, sin Excel."**

> **"Te lo enseño con una cuenta real anonimizada — Sazonadores en HEB. 62 tiendas, $1.5 millones al mes en sell-out."**

Apunta al **YoY** del hero (–3.8%):

> **"Antes de nada, dato duro: esta cuenta está cayendo -3.8% vs el año pasado. La pregunta que te haría tu Consejo es: ¿por qué? Tu KAM no sabe. Tarda 2 días en armarte la respuesta."**

> **"Yo te la doy en 13 minutos."**

**Transición:** click en pestaña 2 (Sugeridos).

---

## Acto 2 — Sugeridos: "Deja de adivinar qué tienda pedir hoy" (2:00 – 6:00)

**Pestaña: `/sugeridos`**

Mientras carga:

> **"Esta es la vista #1 de tu KAM cada mañana. Te explico el cambio: ya no abre Excel."**

Apunta al **hero rojo** ($86,137):

> **"Esto es lo que tu equipo NO está viendo hoy. $86 mil pesos de venta en riesgo, ahora mismo, porque hay tiendas con stock crítico que nadie pidió."**

> **"De esos, $28 mil son críticos: tiendas que en menos de 24 horas se quedan sin producto. Eso es venta perdida con nombre y apellido."**

**Aquí viene el shift de tono — el beneficio en horas:**

> **"Si tu KAM hiciera esto a mano, tendría que: bajar el reporte de inventarios de HEB, pegarlo a Excel, sacar la velocidad por SKU, calcular DDI, decidir cuántas cajas, mandar el pedido. **2 horas diarias.** 10 horas por semana. Medio día de KAM cada semana solo para NO perder venta."**

> **"Aquí lo ves en 30 segundos. Mismas decisiones, mejor información, sin Excel."**

Apunta a la **tabla de sugeridos** y al **sticky action bar** (si seleccionas algo):

> **"Y mira esto. Selecciona los críticos, marca 'enviado', se acabó. Tu KAM recupera 2 horas diarias y nadie más se entera de los quiebres antes que tú."**

**Si pregunta "¿de dónde sale el cálculo?":**

> **"Velocidad de los últimos 30 días en esa tienda + inventario actual + lead time del CEDIS. La cuenta es la que tu KAM ya hace, pero la hacemos nosotros en milisegundos en lugar de horas."**

**Cifras clave de este acto:**
- $86k en riesgo HOY · $28k crítico
- 2 horas/día ahorradas al KAM
- 341 decisiones pre-calculadas

**Transición:** "Pero el verdadero ahorro empieza cuando aterrizas en UNA tienda específica. Sígueme."

---

## Acto 3 — Detalle tienda: "Deja de abrir 5 archivos para entender qué pasa" (6:00 – 9:30)

**Pestaña: `/tiendas/<heb-mty-contry>`**

> **"Esto es HEB Monterrey Country. Cuando tu Consejo te pregunta 'oye, ¿qué pasa en Monterrey?', hoy tu KAM hace lo siguiente:"**

Levanta la mano y va contando con los dedos:

> **"Uno: abre el reporte de inventarios. Dos: abre el reporte de ventas. Tres: abre el archivo de OCs. Cuatro: abre Excel para juntar todo. Cinco: te manda un mail con captura. **45 minutos por consulta.**"**

> **"Tú la haces aquí en 5 segundos."**

Apunta a la **card roja "SKUs en quiebre ahora"**:

> **"14 sugeridos pendientes. 2 críticos. $9,239 en riesgo en una sola tienda. Y mira lo que NO está vendiendo:"** (clic a uno de los SKUs en quiebre).

Apunta a la **card "Sugeridos pendientes para esta tienda"**:

> **"Y aquí está qué hacer, ya cuantificado. Pedir tantas cajas. Tu KAM lo lee, hace el pedido, y el sábado la tienda no quiebra."**

**El beneficio dual:**

> **"Aquí ganas en dos lados al mismo tiempo: tu KAM ahorra 45 minutos por escalación interna, y tú no pierdes los $9k de venta que se iban a quedar en la mesa."**

**Si pregunta "¿qué pasa si quiero exportar esto?":**

Scroll a la tabla de SKUs, apunta al **botón CSV**:

> **"Un click. Reporte completo de la tienda en CSV. Para tu Consejo, para conciliar con HEB, para lo que quieras."**

**Cifras clave de este acto:**
- 45 min/consulta → 5 segundos
- $9k de venta recuperable en esa sola tienda
- 0 Excels intermedios

**Transición:** "Y todo esto es operativo. Lo siguiente es estratégico — el forecast."

---

## Acto 4 — Forecast: "Deja de proyectar a mano cada mes" (9:30 – 12:00)

**Pestaña: `/forecast`**

> **"Esta vista la diseñé pensando en ti, no en tu KAM. ¿Cuánto tarda tu equipo de planeación en armarte el forecast mensual?"**

Espera respuesta. Si dice "1 semana" / "1 día / no lo hacemos formalmente":

> **"Aquí lo tienes corriendo todo el tiempo, sin que nadie lo arme."**

Apunta al **hero number** (Pronóstico próximos 30d):

> **"Pronóstico de los próximos 30 días. Combina mes anterior + año anterior + tendencia 8 semanas. Lo calculó solo, hace unos segundos."**

Apunta al **KPI "Precisión"**:

> **"Y te decimos qué tan confiable es. Backtest de 30 días: precisión [X%]. Si dice $1.5M, vas a vender entre $1.4 y $1.6M."**

**El beneficio en horas/dinero:**

> **"En tu operación actual, este número lo arma tu equipo de planeación: 1 día de trabajo cada mes, mínimo. Aquí lo tienes 24/7, refrescado al instante, validado contra realidad. **12 días de planeación por año que ya no necesitas.**"**

Apunta a los **deltas** (vs mes anterior, vs año anterior, tendencia 8 sem):

> **"Y para tu junta de Consejo: vas a poder responder 'estamos creciendo X% vs el año anterior, con confianza Y%', sin pedirle a Finanzas que te corra el reporte."**

**Cifras clave de este acto:**
- 12 días/año de planeación ahorrados
- Pronóstico validado con MAPE (no opinión)
- Respuesta a Consejo en segundos

**Transición:** "Y todo esto cierra con el deliverable que tu KAM presenta el lunes."

---

## Acto 5 — Reporte PDF: "Deja de copy-paste a PowerPoint" (12:00 – 13:30)

**Pestaña: `/reporte`**

Espera que cargue.

> **"Esta es la última vista. Es el PDF que tu KAM imprime el lunes en la mañana para su junta de equipo."**

> **"Hoy tu equipo arma este reporte así: baja datos de 4 sistemas, los pone en Excel, hace gráficas, las pega en PowerPoint, formato. **3 horas mensuales solo para que la junta del lunes se vea profesional.**"**

> **"Aquí: Ctrl+P. Listo."**

Scroll a **Resumen Ejecutivo** y **Primer Movimiento Sugerido**:

> **"1 hoja, 1 mensaje, listo para llevar. Sin que tu KAM tenga que justificar de dónde salió cada número."**

Scroll a **Lost Sale Ledger YTD**:

> **"Y al final, el número que importa: cuánto dinero se perdió en lo que va del año por quiebres que se podían evitar. Este es el dato que un director quiere ver primero cada mes."**

**Cifras clave de este acto:**
- 3 horas/mes ahorradas en reporting
- 36 horas/año = 1 semana de KAM
- 0 Excel + 0 PowerPoint

**Transición:** cierra el PDF, voltea a ver al cliente directamente.

---

## Acto 6 — Cierre: "Las cuentas claras" (13:30 – 15:00)

Saca la hoja ROI imprimible (`docs/DEMO_ROI_SHEET.md`). Ponla sobre la mesa.

> **"Te resumo en pesos y horas."**

Apunta a los 5 bloques de la hoja:

> **"Por cada KAM que tengas operando una cadena como HEB, RushData libera **10 horas a la semana**. Eso son **520 horas al año**. Equivale a **medio KAM extra** que no tienes que contratar — o que puedes dedicar a abrir nuevas cuentas en lugar de apagar incendios."**

> **"Y en dinero: capturando el 30% del riesgo que vimos hoy son **$25k mensuales** de venta que NO se pierde. **$300k al año**."**

> **"Eso, en una cuenta de $18M anuales, es 1.7 puntos de margen recuperados. Solo con esta cuenta. Si tienes 3 cadenas, multiplica."**

Pausa larga. Mira a los ojos.

> **"El pilot son 90 días. Tu equipo arranca el primer lunes con tus datos reales. Si al día 90 no ves impacto medible, te regreso el dinero."**

Pregunta directa, sin sonreír:

> **"¿Te parece si te mando la propuesta esta tarde y arrancamos pilot el lunes?"**

---

## Anticipación de objeciones (estilo Savio: respuesta corta + tranquilizadora)

### "¿Cuánto cuesta?"

> **"El pilot 90 días lo costeo según tu tamaño. Para una operación como esta hablamos de $20-50k al mes. Lo recuperas el primer mes solo con la venta que NO se pierde."**

### "Ya tenemos Power BI / SAP IBP / [otro]"

> **"Perfecto. RushData no reemplaza tu BI — lo complementa. Power BI te dice qué pasó. Nosotros te decimos qué hacer mañana. Tu equipo sigue usando Power BI; nosotros le ahorramos las 2 horas diarias de armar la lista de pedidos a mano."**

### "¿Cuánto tarda implementarlo?"

> **"1 semana. Día 1: nos das archivos de tiendas y SKUs. Día 3: cargamos histórico. Día 7: tu KAM está usando la herramienta con datos reales. Sin IT, sin proyecto de 6 meses."**

### "¿Mis datos están seguros?"

> **"Multi-tenant con Row Level Security a nivel base de datos. Solo tu equipo ve tus números. Para clientes que lo pidan, podemos darte una instancia dedicada."**

### "¿Funciona para [MERCO/Walmart/Soriana]?"

> **"HEB ya. MERCO en 2 semanas si lo necesitas para el pilot. Walmart y Soriana, 2-3 semanas cada una. Lo cotizo aparte."**

### "Mi KAM tiene 8 años haciendo esto a mano, no quiere cambiar"

> **"Justo por eso. No le quitamos su criterio — le quitamos las 2 horas diarias de armar listas en Excel. Su decisión final sigue siendo suya. Le damos los datos pre-calculados para que decida mejor y más rápido."**

### "¿Y si no quiero pilot, quiero demo más a fondo?"

> **"Genial. Dame tus archivos reales (1 mes de inventario, 1 mes de ventas, OCs del trimestre). En 3 días te enseño cómo se vería TU cuenta. Sin compromiso, sin firma."**

---

## Cheat sheet (imprimir en hoja aparte)

```
VERBO ANCLA
  "Toma decisiones en minutos, las que hoy te llevan días."

TIEMPOS
  0-2     Hook (Home, YoY -3.8%, plantear "días vs minutos")
  2-6     Sugeridos ($86k riesgo, 2h/día ahorradas)
  6-9:30  Drill HEB MTY CONTRY ($9k, 45min→5s)
  9:30-12 Forecast (12 días/año de planeación ahorrados)
  12-13:30 Reporte PDF (3h/mes en reporting)
  13:30-15 Cierre con HOJA ROI sobre la mesa

DOLORES POR VISTA (orden Savio: dolor primero)
  /                "Deja de armar reportes ejecutivos en Excel"
  /sugeridos       "Deja de adivinar qué tienda pedir hoy"
  /tiendas/[id]    "Deja de abrir 5 archivos para entender una tienda"
  /forecast        "Deja de proyectar a mano cada mes"
  /reporte         "Deja de copy-paste a PowerPoint"

NÚMEROS CLAVE (memorizar — estos son las anclas)
  10 horas/semana ahorradas por KAM
  520 horas/año = medio KAM extra
  $25k/mes capturando 30% del riesgo
  $300k/año de venta no perdida
  1 semana de onboarding
  90 días de pilot con garantía

NÚMEROS DE LA CUENTA DEMO
  Sazonadores Vence Real · HEB · 62 tiendas · 15 SKUs
  Revenue 12m: $18.1M · YoY: -3.8%
  Sugeridos: 341 · $86k riesgo · $28k crítico
  Top SKU 30d: Carne Seca Machacado 250gr ($476k)
  Tienda problema #1: HEB MTY CONTRY ($9k riesgo)

QUÉ NO DECIR
  ✗ "feature", "funcionalidad", "módulo"
  ✗ "DDI", "MAPE", "fill rate" sin traducir a impacto
  ✗ "es solo demo" / "datos mock"
  ✗ "está en beta" / "pronto vamos a..."
  ✗ Hablar de stack técnico (Supabase, Next.js, RPC, etc.)

QUÉ SÍ DECIR (vocabulario Savio adaptado)
  ✓ "Deja de [acción manual]"
  ✓ "Tu KAM ahorra X horas a la semana"
  ✓ "Decisiones en minutos que antes llevaban días"
  ✓ "Sin Excel", "sin PowerPoint", "1 click"
  ✓ "Lunes" (urgencia concreta)
  ✓ "Pesos en la mesa", "venta que NO se pierde"
  ✓ "Medio KAM extra que no tienes que contratar"
```

---

## Después de la junta

- [ ] Mismo día: enviar propuesta por correo (PDF de 2 páginas máx). Incluir: hoja ROI con SUS números reales si te los dio.
- [ ] Día +2: WhatsApp de seguimiento ("¿pudiste revisar la propuesta?").
- [ ] Día +7 si no hay respuesta: llamada con UN dato nuevo o testimonio.
- [ ] Documentar la junta en `docs/CLIENTS.md` (interés, objeciones, próximo paso).
