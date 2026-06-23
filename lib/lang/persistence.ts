/**
 * PERSISTENCIA DE CONOCIMIENTO APRENDIDO
 * 
 * Guarda y carga documentos aprendidos por el agente en el filesystem.
 * Cada documento aprendido se guarda como archivo JSON individual.
 */

import fs from 'fs/promises';
import path from 'path';
import { Document } from '@langchain/core/documents';

const LEARNED_DOCS_DIR = path.join(process.cwd(), 'lib/lang/knowledge/aprendido');

/**
 * Inicializa el directorio de documentos aprendidos
 */
async function initLearnedDocsDir(): Promise<void> {
  try {
    await fs.mkdir(LEARNED_DOCS_DIR, { recursive: true });
  } catch (error) {
    console.error('[Persistencia] Error creando directorio:', error);
  }
}

/**
 * Guarda un documento aprendido en el filesystem
 */
export async function persistirDocumento(doc: Document, id: string): Promise<boolean> {
  try {
    await initLearnedDocsDir();
    
    const filename = `${id}.json`;
    const filepath = path.join(LEARNED_DOCS_DIR, filename);
    
    const data = {
      id,
      pageContent: doc.pageContent,
      metadata: doc.metadata,
      guardado_en: new Date().toISOString()
    };
    
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Persistencia] ✓ Documento guardado: ${filepath}`);
    
    return true;
  } catch (error) {
    console.error('[Persistencia] Error guardando documento:', error);
    return false;
  }
}

/**
 * Carga todos los documentos aprendidos del filesystem
 */
export async function cargarDocumentosAprendidos(): Promise<Document[]> {
  try {
    await initLearnedDocsDir();
    
    const files = await fs.readdir(LEARNED_DOCS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log('[Persistencia] No hay documentos aprendidos guardados');
      return [];
    }
    
    const docs: Document[] = [];
    
    for (const file of jsonFiles) {
      try {
        const filepath = path.join(LEARNED_DOCS_DIR, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const data = JSON.parse(content);
        
        docs.push(new Document({
          pageContent: data.pageContent,
          metadata: {
            ...data.metadata,
            id: data.id,
            guardado_en: data.guardado_en
          }
        }));
      } catch (err) {
        console.error(`[Persistencia] Error cargando ${file}:`, err);
      }
    }
    
    console.log(`[Persistencia] ✓ Cargados ${docs.length} documentos aprendidos`);
    return docs;
    
  } catch (error) {
    console.error('[Persistencia] Error cargando documentos:', error);
    return [];
  }
}

/**
 * Elimina un documento aprendido
 */
export async function eliminarDocumento(id: string): Promise<boolean> {
  try {
    const filepath = path.join(LEARNED_DOCS_DIR, `${id}.json`);
    await fs.unlink(filepath);
    console.log(`[Persistencia] ✓ Documento eliminado: ${id}`);
    return true;
  } catch (error) {
    console.error(`[Persistencia] Error eliminando ${id}:`, error);
    return false;
  }
}

/**
 * Lista IDs de todos los documentos aprendidos
 */
export async function listarDocumentosAprendidos(): Promise<string[]> {
  try {
    await initLearnedDocsDir();
    const files = await fs.readdir(LEARNED_DOCS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    console.error('[Persistencia] Error listando documentos:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas de documentos aprendidos
 */
export async function obtenerEstadisticas(): Promise<{
  total: number;
  tipos: Record<string, number>;
  fuentes: Record<string, number>;
}> {
  const docs = await cargarDocumentosAprendidos();
  
  const stats = {
    total: docs.length,
    tipos: {} as Record<string, number>,
    fuentes: {} as Record<string, number>
  };
  
  for (const doc of docs) {
    const tipo = doc.metadata.tipo as string || 'sin_tipo';
    const fuente = doc.metadata.fuente as string || 'sin_fuente';
    
    stats.tipos[tipo] = (stats.tipos[tipo] || 0) + 1;
    stats.fuentes[fuente] = (stats.fuentes[fuente] || 0) + 1;
  }
  
  return stats;
}
