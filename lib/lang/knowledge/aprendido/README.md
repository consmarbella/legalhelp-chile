# 🧠 Documentos Aprendidos por el Agente

Este directorio contiene conocimiento que el agente ha aprendido automáticamente durante sus interacciones con usuarios.

## ¿Cómo Funciona?

1. **Primera vez**: Usuario pregunta por un documento que no está en el RAG
2. **Búsqueda**: Agente busca en fuentes oficiales (BCN, Dirección del Trabajo, etc.)
3. **Aprendizaje**: Agente guarda la información encontrada como archivo JSON aquí
4. **Próximas veces**: El agente ya tiene la información y responde instantáneamente

## Formato de Archivos

Cada archivo es un JSON con esta estructura:

```json
{
  "id": "learned_1782257759354_iy5khy59l",
  "pageContent": "CONTRATO DE TRABAJO\n\nFUENTE OFICIAL: Dirección del Trabajo...",
  "metadata": {
    "titulo": "Contrato de Trabajo",
    "tipo": "plantilla_laboral",
    "fuente": "Dirección del Trabajo Chile + Código del Trabajo Arts. 9-11",
    "fecha": "2026-06-22T...",
    "tags": ["contrato", "trabajo", "laboral"],
    "fecha_agregado": "2026-06-22T...",
    "aprendido_por_agente": true,
    "type": "conocimiento_aprendido",
    "id": "learned_1782257759354_iy5khy59l"
  },
  "guardado_en": "2026-06-22T..."
}
```

## Beneficios

✅ **Aprendizaje continuo**: El agente mejora con cada interacción
✅ **Persistencia**: Sobrevive entre reinicios del servidor
✅ **Escalabilidad**: Crece orgánicamente según necesidades reales
✅ **Eficiencia**: Menos llamadas a web search, respuestas más rápidas
✅ **Trazabilidad**: Cada documento tiene metadata de origen y fecha

## Gestión

Para ver estadísticas de documentos aprendidos:

```bash
npm run tsx lib/lang/scripts/stats-conocimiento.ts
```

Para limpiar conocimiento obsoleto:

```bash
npm run tsx lib/lang/scripts/limpiar-conocimiento.ts
```

## Estructura del RAG Completo

- **330 documentos base**: Plantillas BCN + templates del sistema
- **+N documentos aprendidos**: Los que se van agregando aquí automáticamente

Total actual: 330 + N documentos
