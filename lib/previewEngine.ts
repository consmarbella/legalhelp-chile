// Motor de preview de documentos legales chilenos
import { getTemplate } from './templates';

export type FormData = Record<string, string>;

export function renderPreview(docId: string, data: FormData, paid: boolean): string {
  let template = getTemplate(docId);

  // Reemplazar {{variable}} por valor
  template = template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = data[key];
    if (val === undefined || val === null) return `[${key}]`;
    return val;
  });

  // Reemplazar condicionales {{#if key}} contenido {{/if}}
  template = template.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, content) => {
    const val = data[key];
    if (val && val.trim().length > 0) return content;
    return '';
  });

  // Reemplazar {{#if key==val}} contenido {{/if}}
  template = template.replace(/\{\{#if (\w+)==(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, val, content) => {
    const actualVal = data[key];
    if (actualVal === val) return content;
    return '';
  });

  // {{else if key==val}} contenido
  template = template.replace(/\{\{else if (\w+)==(\w+)\}\}([\s\S]*?)(?=\{\{else\}\}|\{\{else if|\{\{\/if\}\})/g, (_match, key, val, content) => {
    const actualVal = data[key];
    if (actualVal === val) return content;
    return '';
  });

  // {{else}} (simple)
  template = template.replace(/\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');

  // {{fechaActual}}
  template = template.replace(/\{\{fechaActual\}\}/g, () => {
    return new Date().toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  });

  return template;
}

export function getTemplateTitle(docId: string): string {
  const titles: Record<string, string> = {
    tag: 'Solicitud de Prescripción de Multas TAG (Ley 18.287)',
    finiquito: 'Solicitud de Finiquito Laboral (Art. 177 C. del Trabajo)',
    reclamo: 'Carta de Reclamo Formal',
    poder: 'Poder Notarial Especial',
    familia: 'Solicitud de Derecho de Familia',
    arrendamiento: 'Contrato de Arrendamiento',
    proteccion: 'Recurso de Protección (Art. 20 CPR)',
    otro: 'Documento Legal Personalizado',
  };
  return titles[docId] || 'Documento Legal';
}
