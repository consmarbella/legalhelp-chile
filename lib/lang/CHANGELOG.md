# 📝 Changelog - LangGraph Agent

## [2.0.0] - 2026-06-23

### 🎉 MAJOR: Persistencia y Aprendizaje Incremental

**Added:**
- ✅ Sistema de persistencia en filesystem (`persistence.ts`)
- ✅ Directorio `knowledge/aprendido/` para documentos aprendidos
- ✅ Tool `agregar_conocimiento_nuevo` para guardar conocimiento
- ✅ Script `stats-conocimiento.ts` para ver estadísticas del RAG
- ✅ Script `limpiar-conocimiento.ts` para gestionar documentos
- ✅ README completo del sistema (`lib/lang/README.md`)
- ✅ Demo `test-aprendizaje-incremental.ts` con ejemplos

**Changed:**
- 🔄 `vectorstore.ts`: Ahora carga documentos aprendidos al inicio
- 🔄 `agregarDocumentoAlRAG`: Ahora persiste en filesystem automáticamente
- 🔄 `consultarRAG`: Prioriza documentos aprendidos (bonus +0.5 score)
- 🔄 `buscarEnWebTool`: Ahora instruye al agente a usar agregar_conocimiento_nuevo

**Resultado:**
- RAG crece de 330 → 331+ documentos automáticamente
- Conocimiento sobrevive entre reinicios del servidor
- Agente se vuelve más eficiente con cada interacción

---

## [1.0.0] - 2026-06-22

### 🎉 MAJOR: Integración Plantillas Oficiales BCN

**Added:**
- ✅ 8 plantillas oficiales BCN en `knowledge/bcn-plantillas.ts`
  * Finiquito Laboral (Dirección del Trabajo)
  * Poder Simple (Código Civil)
  * Reclamo SERNAC (Ley 19.496)
  * Prescripción Multa TAG (Ley 18.287)
  * Demanda de Alimentos (Ley 14.908)
  * Recurso de Protección (Constitución Art. 20)
  * Carta de Renuncia (CT Art. 159 N°2)
  * Despido Injustificado (CT Arts. 168-171)
- ✅ Tool `buscarEnWebTool` para consultar fuentes oficiales
- ✅ Test suite: `test-10-casos.ts` con 10 casos complejos

**Changed:**
- 🔄 `graph.ts`: Mejora extracción de campos
  * Sync de empresa/empleador
  * Mejor detección de apoderado
  * Extracción de monto, recurrido, derecho_vulnerado
  * Detección de documento por contexto (internet → reclamo SERNAC)
- 🔄 `vectorstore.ts`: RAG aumentado de ~80 docs → 330 docs
- 🔄 System prompt: Instruye al agente a consultar fuentes oficiales

**Fixed:**
- 🐛 Caso 2: Apoderado no se detectaba en poder simple
- 🐛 Caso 4: Field name mismatch (empresa vs empleador)
- 🐛 Caso 6: Faltaba extracción de monto
- 🐛 Caso 7: Faltaba derecho_vulnerado
- 🐛 Caso 8: Field name mismatch (empresa vs empleador)
- 🐛 Caso 10: No detectaba tipo de documento (reclamo)

**Resultado:**
- Test suite: 4/10 → 10/10 (40% → 100%)
- Agente usa fuentes oficiales en vez de "conocimiento LLM"

---

## [0.1.0] - 2026-06-21

### 🎉 Lanzamiento Inicial

**Added:**
- ✅ LangGraph agent básico (`graph.ts`)
- ✅ RAG con templates del sistema (~80 documentos)
- ✅ Extracción semántica de datos
- ✅ Tools básicas (consultar requisitos, validar completitud)
- ✅ Endpoint `/api/lang/chat`
- ✅ Frontend `/app/lang/page.tsx`

**Resultado:**
- Funcionalidad básica operativa
- Test suite: 4/10 casos pasando (40%)

---

## 📊 Resumen de Progreso

| Versión | Documentos RAG | Test Suite | Features |
|---------|----------------|------------|----------|
| 0.1.0   | ~80            | 4/10 (40%) | RAG básico |
| 1.0.0   | 330            | 10/10 (100%) | BCN templates |
| 2.0.0   | 330+N          | 10/10 (100%) | Persistencia + Aprendizaje |

**Total mejora:**
- RAG: +4x más documentos (80 → 330+)
- Tests: +150% tasa de éxito (40% → 100%)
- Features: +5 tools, persistencia, aprendizaje incremental
