# LegalHelp Chile ⚖️

Plataforma de redacción de documentos legales chilenos con inteligencia artificial. Genera cartas, poderes, finiquitos, reclamos, recursos de protección y más, con formato judicial listo para presentar.

## 🚀 Instalación

```bash
npm install
cp .env.example .env.local   # Edita con tus credenciales
npm run dev
```

Accede en: **http://localhost:3002**

## ⚙️ Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `ANTHROPIC_API_KEY` | API key de Anthropic (Claude) | Sí |
| `DEEPSEEK_API_KEY` | API key de DeepSeek (fallback LLM) | Opcional |
| `MP_ACCESS_TOKEN` | Token de acceso de MercadoPago | Sí (pagos) |
| `MP_WEBHOOK_SECRET` | Secret para verificar webhooks de MP | Opcional |
| `SUPABASE_URL` | URL del proyecto Supabase | Sí (persistencia) |
| `SUPABASE_SERVICE_KEY` | Service key de Supabase | Sí (persistencia) |
| `NEXT_PUBLIC_BASE_URL` | URL pública de la app | Sí |
| `ALLOW_TEST_PAYMENT` | Habilita botón de pago de prueba | Opcional |
| `DEV_BYPASS_PASSWORD` | Clave para bypass de pago (dev) | Opcional |

> Sin `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`, las órdenes se guardan en memoria (se pierden al reiniciar).

## 📁 Estructura del Proyecto

```
app/
├── page.tsx                    # Homepage — chat + generador de documentos
├── demandas/page.tsx           # Módulo de demandas judiciales
├── p/[slug]/page.tsx           # Páginas pSEO (guías legales)
├── pago/
│   ├── exito/page.tsx          # Confirmación de pago exitoso
│   ├── error/page.tsx          # Pago fallido
│   ├── pendiente/page.tsx      # Pago pendiente
│   └── recuperar/page.tsx      # Recuperar documento por orderId
├── api/
│   ├── chat/route.ts           # Chat con IA (recopila datos del caso)
│   ├── generate-final/route.ts # Genera documento (preview o completo)
│   ├── payment/
│   │   ├── create/route.ts     # Crea preferencia de pago en MP
│   │   ├── webhook/route.ts    # Webhook de MercadoPago
│   │   ├── status/route.ts     # Verifica estado de pago
│   │   └── test/route.ts       # Pago de prueba (sin cobro real)
│   ├── dev/bypass/route.ts     # Dev bypass — genera orden sin pago
│   ├── recover/route.ts        # Recuperar documento por orderId
│   └── health/route.ts         # Health check
components/
├── ChatGenerator.tsx           # Chat + vista previa (usado en páginas pSEO)
├── CourtDocument.tsx           # Renderiza texto como documento judicial
├── DocumentPreview.tsx         # Preview progresivo mientras se chatea
├── PaywallModal.tsx            # Modal de pago con MercadoPago
├── DevBypassModal.tsx          # Modal de acceso dev (triple-click)
├── LegalOSNav.tsx              # Navegación global
└── LegalOSBackground.tsx       # Fondo animado
lib/
├── constants.ts                # Tipos, DOC_TYPES, precios
├── llm.ts                      # Wrapper LLM (Anthropic/DeepSeek)
├── orderStore.ts               # CRUD de órdenes (Supabase + fallback memory)
├── prompts.ts                  # System prompts para el chat
├── templates.ts                # Plantillas legales verificadas
├── generatePdf.ts              # Generación de PDF (cliente)
├── generateDocx.ts             # Generación de Word/DOCX (cliente)
├── rateLimit.ts                # Rate limiting por IP
├── grounding.ts                # Grounding legal para documentos
└── validateEnv.ts              # Validación de variables de entorno
data/
├── paginas.json                # Configuración de páginas pSEO
├── leyes.ts                    # Base de leyes chilenas
├── hub_guides.json             # Guías para hubs temáticos
└── contenido-unico.json        # Contenido único por página
```

## 🔑 Dev Bypass (Acceso Desarrollador)

Para generar documentos sin pasar por MercadoPago durante desarrollo:

1. Configura `DEV_BYPASS_PASSWORD` en `.env.local`
2. En la app, haz **triple click** en el punto de estado (dot verde/cyan) del header
3. Ingresa la clave configurada
4. Se crea una orden `approved` y se genera el documento completo

> El bypass NO funciona si `DEV_BYPASS_PASSWORD` no está configurada o está vacía.

## 💳 Flujo de Pago

1. Usuario completa el chat → documento preview (truncado + blur)
2. Click "Desbloquear documento" → PaywallModal
3. Pago vía MercadoPago → webhook confirma → orden `approved`
4. Retorno a la app → genera documento completo → descarga PDF/Word

### Pago de Prueba

Si `ALLOW_TEST_PAYMENT=true`, aparece un botón "Probar flujo sin cobro" en el PaywallModal. Crea una orden aprobada sin cobro real.

### Recuperar Documento

Si el usuario pierde el documento, puede recuperarlo en `/pago/recuperar` ingresando su `orderId`.

## 🧪 Testing Local

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run lint         # ESLint
```

## 📝 Notas

- Los documentos generados se persisten en la orden (`documentUrl`) para recuperación posterior
- Rate limiting: 10 generaciones por minuto por IP
- Sin API keys de LLM, el sistema genera documentos mock
- Las plantillas verificadas (`lib/templates.ts`) garantizan artículos legales correctos para casos comunes
