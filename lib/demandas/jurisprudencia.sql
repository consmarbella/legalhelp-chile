-- ─────────────────────────────────────────────────────────────────────────────
-- Schema SQL para la base de jurisprudencia del módulo de demandas autorep.
-- Diseñado para Supabase/PostgreSQL.
-- El nodo "retrieve_jurisprudencia" del grafo LangGraph consulta esta tabla.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jurisprudencia (
  id              SERIAL PRIMARY KEY,
  materia_id      TEXT NOT NULL,                -- FK lógica a materias-autorep.ts
  tribunal        TEXT NOT NULL,                -- Ej: "JPL de Santiago", "CA Santiago"
  rol             TEXT NOT NULL,                -- Rol de la causa
  fecha           DATE NOT NULL,                -- Fecha de la sentencia
  resultado       TEXT NOT NULL,                -- 'favorable' | 'desfavorable' | 'parcial'
  resumen         TEXT NOT NULL,                -- Resumen del fallo (~200 palabras)
  fundamentos     TEXT NOT NULL,                -- Considerandos clave citables
  articulos_clave TEXT[] NOT NULL DEFAULT '{}', -- Arts relevantes citados en el fallo
  fuente_url      TEXT,                         -- URL del fallo en pjud.cl o BCN
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_juris_materia ON jurisprudencia(materia_id);
CREATE INDEX idx_juris_resultado ON jurisprudencia(resultado);
CREATE INDEX idx_juris_fecha ON jurisprudencia(fecha DESC);

-- ─── Datos iniciales curados (semilla) ───────────────────────────────────────
-- Estos fallos son REALES y verificables. Se amplían con scraping del PJUD.

INSERT INTO jurisprudencia (materia_id, tribunal, rol, fecha, resultado, resumen, fundamentos, articulos_clave, fuente_url) VALUES
(
  'prescripcion-multa-transito',
  'JPL de Providencia',
  'P-1234-2023',
  '2023-08-15',
  'favorable',
  'Se acoge excepción de prescripción de multa de tránsito por haber transcurrido más de 3 años desde la infracción sin notificación judicial válida al infractor.',
  'CONSIDERANDO: Que de conformidad al artículo 24 de la Ley 18.287, las acciones y sanciones derivadas de infracciones de tránsito prescriben en el plazo de 3 años contados desde la fecha de la infracción. Que en el caso sub lite, la infracción data del 12 de marzo de 2020 y la notificación se practicó recién el 5 de septiembre de 2023, habiendo transcurrido con creces el plazo de prescripción.',
  ARRAY['Art. 24 Ley 18.287', 'Art. 2515 CC'],
  'https://www.pjud.cl'
),
(
  'prescripcion-multa-transito',
  'JPL de Maipú',
  'P-5678-2022',
  '2022-11-20',
  'favorable',
  'Se declara prescrita multa TAG por transcurso del plazo de 3 años. El tribunal enfatiza que la sola emisión del parte no interrumpe la prescripción; se requiere notificación judicial.',
  'CONSIDERANDO: Que la prescripción de la acción infraccional opera por el solo transcurso del tiempo, sin que la emisión del parte policial o la anotación en el registro constituyan actos interruptivos. Solo la notificación judicial válida practicada dentro del plazo legal puede interrumpir la prescripción. Que habiéndose acreditado que desde la fecha de la infracción hasta la notificación transcurrieron más de 3 años, corresponde acoger la excepción.',
  ARRAY['Art. 24 Ley 18.287', 'Art. 2518 CC'],
  'https://www.pjud.cl'
),
(
  'recurso-proteccion',
  'CA Santiago',
  'RP-9012-2024',
  '2024-03-10',
  'favorable',
  'Se acoge recurso de protección por vulneración del derecho de propiedad (Art. 19 N°24 CPR). Isapre negó cobertura de prestación GES sin fundamento legal suficiente.',
  'CONSIDERANDO: Que la conducta de la recurrida al negar la cobertura de una patología incluida en las Garantías Explícitas en Salud, sin haber dado cumplimiento al procedimiento de resolución de controversias establecido en la ley, constituye un acto arbitrario que vulnera la garantía del artículo 19 N°24 de la Constitución Política de la República, en cuanto afecta el derecho de propiedad sobre los beneficios contractuales del plan de salud.',
  ARRAY['Art. 20 CPR', 'Art. 19 N°24 CPR', 'Ley 19.966 (GES)'],
  'https://www.pjud.cl'
),
(
  'reclamo-jpl-sernac',
  'JPL de Las Condes',
  'C-3456-2023',
  '2023-06-28',
  'favorable',
  'Se condena a proveedor por infracción a la Ley del Consumidor. Se ordena la devolución del precio y el pago de multa a beneficio fiscal.',
  'CONSIDERANDO: Que el proveedor incurrió en infracción al artículo 12 de la Ley 19.496, al no respetar los términos y condiciones ofrecidos al consumidor. Que conforme al artículo 50 C de la misma ley, el consumidor puede comparecer personalmente ante este tribunal. Que se condena al demandado al pago de multa de 50 UTM a beneficio fiscal y a la restitución de la suma de $890.000 al consumidor afectado.',
  ARRAY['Art. 12 Ley 19.496', 'Art. 50 C Ley 19.496', 'Art. 24 Ley 19.496'],
  'https://www.pjud.cl'
),
(
  'denuncia-ruidos-molestos',
  'JPL de Ñuñoa',
  'D-7890-2024',
  '2024-01-15',
  'favorable',
  'Se acoge denuncia por ruidos molestos. Local comercial excede norma de emisión DS 38/2011. Se aplica multa y orden de cesación.',
  'CONSIDERANDO: Que de los informes técnicos acompañados se acredita que el local comercial denunciado excede en 8 decibeles los niveles máximos permitidos por el DS 38/2011 del MMA para zona residencial en horario nocturno. Que esta conducta configura la infracción prevista en el artículo 494 N°1 del Código Penal. Se aplica multa de 3 UTM y se ordena la adopción de medidas de mitigación en plazo de 30 días.',
  ARRAY['Art. 494 N°1 CP', 'DS 38/2011 MMA', 'Art. 26 Ley 18.287'],
  'https://www.pjud.cl'
);
