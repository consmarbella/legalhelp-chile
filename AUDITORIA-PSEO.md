# Auditoría PSEO — LegalHelp Chile

## 🔴 Bug Crítico Detectado: hub_guides.json

**Todos los topics tienen las mismas leyes laborales**, independientemente de la categoría.

| Topic | Leyes que muestra | Debería mostrar |
|-------|------------------|-----------------|
| Acuerdo de divorcio | Art. 162 CT (despido), Art. 19 Ley 17.322 (cotizaciones) | Ley 19.947 (Nuevo Régimen Matrimonial), CC artículos |
| Acuerdo de tuición compartida | Art. 162 CT, Art. 19 Ley 17.322 | Ley 19.968 (Tribunales de Familia), CC |
| Alzamiento de embargo | Art. 162 CT, Art. 19 Ley 17.322 | CPC arts. 446+ |
| Poder simple | Art. 162 CT, Art. 19 Ley 17.322 | CC arts. 2116+ (mandato) |

**Causa raíz**: La generación del JSON usó un template único y nunca se personalizó por categoría.

---

## Plan de Auditoría con Datos Ficticios

### 1. Prescripción TAG (prueba principal)

**Situación ficticia**: María González, RUT 15.123.456-7, recibió cobro de autopista por $350.000 de TAG impago entre 2019-2020. Vive en Maipú. La multa original es de 2020.

**Pasos manuales**:
1. Ir a `/p/prescripcion-deuda-tag-maipu`
2. Verificar que el H1 diga "Prescripción de deuda TAG en Maipú"
3. Hacer clic en botón "Prescripción TAG" en la homepage
4. En el chat, ingresar:
   - _"Necesito prescribir una deuda TAG de $350.000 en Maipú"_
   - _"Soy María González, RUT 15.123.456-7, vivo en Av. Central 123, Maipú"_
   - _"La deuda es de autopista urbana, del año 2020"_
5. Verificar que el asistente pida los datos correctos
6. Verificar que el documento generado diga "Maipú" y no otra comuna

**Qué verificar**:
- [ ] ¿El chat entiende el contexto de prescripción TAG?
- [ ] ¿Pide los datos correctos (RUT, fecha infracción, monto, autopista)?
- [ ] ¿El documento final tiene los datos ingresados?
- [ ] ¿El documento parece un escrito judicial chileno real?

---

### 2. Demanda de Alimentos

**Situación ficticia**: Camila Soto, RUT 20.987.654-3, vive en Providencia con su hijo de 4 años. El padre, Andrés Muñoz (RUT 18.456.789-0), trabaja en una empresa de seguridad ganando $800.000 líquidos y no paga pensión desde hace 8 meses.

**Pasos manuales**:
1. Ir a `/p/demanda-alimentos-providencia`
2. Seleccionar "Derecho de Familia" en la homepage
3. En el chat:
   - _"Necesito demanda de alimentos para mi hijo de 4 años"_
   - _"Soy Camila Soto, RUT 20.987.654-3, vivo en Providencia"_
   - _"El padre es Andrés Muñoz, RUT 18.456.789-0, gana $800.000"_
   - _"No paga desde hace 8 meses"_

**Qué verificar**:
- [ ] ¿Pregunta por el tribunal de familia correspondiente?
- [ ] ¿Sugiere monto de pensión o pide datos para calcularlo?
- [ ] ¿Incluye referencia a Ley 14.908?
- [ ] ¿El caratulado tiene el tribunal correcto (Juzgado de Familia de Providencia)?

---

### 3. Despido Injustificado

**Situación ficticia**: Pedro Lagos, RUT 16.111.222-3, trabajó 5 años en "Ferretería El Clavo Ltda." en Concepción. Lo despidieron el 15 de marzo de 2026 sin causa, ganaba $650.000 líquidos. No le pagaron indemnización.

**Pasos manuales**:
1. Ir a `/p/denuncia-despido-injustificado-concepcion`
2. Seleccionar "Otro documento" y escribir _"despido injustificado"_
3. En el chat:
   - _"Me despidieron sin causa después de 5 años trabajando"_
   - _"Ganaba $650.000 líquidos en Ferretería El Clavo Ltda."_
   - _"Fue el 15 de marzo de 2026 en Concepción"_

**Qué verificar**:
- [ ] ¿Pregunta por el plazo de 60 días hábiles?
- [ ] ¿Pregunta por causal de despido?
- [ ] ¿Calcula la indemnización correcta (5 meses + recargo 30%)?

---

### 4. Carta Reclamo SERNAC

**Situación ficticia**: Un televisor comprado en "ElectroHogar Ltda." (RUT 77.123.456-8) en Las Condes por $420.000 dejó de funcionar a los 3 meses. La tienda se niega a cambiar el producto.

**Pasos manuales**:
1. Ir a `/p/carta-reclamo-sernac-las-condes`
2. Seleccionar "Carta Reclamo"
3. En el chat:
   - _"Compré un televisor en ElectroHogar y se echó a perder a los 3 meses"_
   - _"Pagué $420.000 con tarjeta de crédito"_
   - _"La tienda está en Las Condes y no quiere cambiarlo"_

**Qué verificar**:
- [ ] ¿Pregunta por la fecha exacta de compra?
- [ ] ¿Sugiere plazo de 6 meses desde la compra (Ley 19.496)?
- [ ] ¿El documento es una carta formal al SERNAC?

---

### 5. Mulplicidad de Ciudades — Detección de Contenido Duplicado

**Situación ficticia**: Abrí estas 3 URLs y compará el contenido real de cada una:

| URL | Categoría | Ciudad |
|-----|-----------|--------|
| `/p/prescripcion-deuda-tag-santiago` | Prescripción TAG | Santiago |
| `/p/prescripcion-deuda-tag-puente-alto` | Prescripción TAG | Puente Alto |
| `/p/prescripcion-deuda-tag-temuco` | Prescripción TAG | Temuco |

**Verificar**:
- [ ] ¿El H1 cambia según la ciudad?
- [ ] ¿El meta description cambia?
- [ ] ¿El contenido del body es >80% idéntico entre las 3?
- [ ] Si el contenido es idéntico → **Alerta roja de thin content PSEO**

---

### 6. Bug de hub_guides.json — Verificación Visual

**Situación ficticia**: Visitá estas 2 URLs y compará la sección "Base legal aplicable":

| URL | Tema |
|-----|------|
| `/p/acuerdo-de-divorcio-por-mutuo-acuerdo` | Divorcio |
| `/p/prescripcion-deuda-tag` | Prescripción TAG |

**Verificar**:
- [ ] ¿Ambas páginas muestran las mismas leyes laborales en "Base legal"?
- [ ] Si es así, confirmá el bug de hub_guides.json

---

## Checklist Resumen

### Funcionalidad
- [ ] Chat responde coherentemente para cada tipo de documento
- [ ] Chat recolecta datos obligatorios (nombre, RUT, domicilio)
- [ ] Chat reconoce el tipo de documento automáticamente
- [ ] El paywall aparece al completar datos
- [ ] El flujo de pago con MercadoPago funciona
- [ ] La descarga de PDF funciona

### SEO On-Page
- [ ] H1 contiene la ciudad/localidad para páginas con city variant
- [ ] Meta title y description son únicos por página
- [ ] FAQPage JSON-LD se renderiza
- [ ] Canonical tag apunta a la URL correcta
- [ ] Las páginas NO indexan si son thin content (<300 palabras)

### Datos
- [ ] hub_guides.json tiene leyes correctas por categoría
- [ ] paginas.json tiene datos correctos para cada slug
- [ ] Las leyes en leyes.ts están actualizadas
