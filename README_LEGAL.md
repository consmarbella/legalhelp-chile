# Asistente Legal Chileno 👨‍⚖️

Aplicación Next.js para redacción asistida de demandas legales usando DeepSeek.

## 🚀 Instalación Rápida

```bash
npm install
npm run dev
```

Accede en: **http://localhost:3000** (o puerto disponible)

## ⚙️ Configuración

### Con API Key de DeepSeek (recomendado)

1. Obtén tu API key en: https://platform.deepseek.com/api_keys
2. Crea `.env.local`:
   ```
   DEEPSEEK_API_KEY=sk_live_xxxxxxxxxxxxxx
   ```
3. Reinicia el servidor

### Modo Mock (sin API key)

Para probar sin conexión a DeepSeek:

```
DEEPSEEK_API_KEY=mock
```

El sistema responde con JSON simulado, permitiendo probar todo el flujo.

## 📋 Estructura

```
app/
├── page.tsx              # Frontend - chat + sidebar con datos
├── api/chat/
│   └── route.ts         # API que conecta con DeepSeek
lib/
└── prompts.ts           # Sistema de prompts y respuestas mock
```

## 🔄 Flujo de Datos

1. **Usuario escribe** → se envía a `/api/chat`
2. **API extrae JSON** → de respuesta de DeepSeek
3. **Frontend acumula** → con `setCaseData(prev => ({ ...prev, ...data }))`
4. **Sidebar actualiza** → mostrando campos completados

## 🛡️ Características

- ✅ Extracción JSON robusta con reintentos automáticos
- ✅ Fallback a modo mock si API falla
- ✅ Acumulación automática de datos
- ✅ Validación de campos completados
- ✅ UI responsiva con Tailwind CSS

## 📝 Campos Recolectados

- **Nombre**: Demandante
- **RUT**: Documento de identidad
- **Dirección**: Domicilio del demandante
- **Destinatario**: Demandado
- **Hechos**: Descripción de los hechos
- **Materia**: Tipo de demanda
- **Ley Citada**: Normas aplicables

## 🔧 Troubleshooting

### "Port 3000 is in use"
El sistema usa el siguiente puerto disponible automáticamente.

### API no responde
- Verifica tu `DEEPSEEK_API_KEY` en `.env.local`
- El sistema caerá a modo mock si la API falla

### JSON inválido
- El sistema reintenta hasta 2 veces
- Si aún falla, usa la respuesta mock por defecto

## 📞 Próximas Mejoras

- [ ] Generación de documento PDF
- [ ] Validación de RUT chileno
- [ ] Historial persistente
- [ ] Múltiples idiomas
