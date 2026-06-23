/**
 * CACHE INTELIGENTE PARA EL AGENTE
 * 
 * Cachea resultados de búsquedas frecuentes para mejorar performance.
 */

interface CacheEntry {
  resultado: any;
  timestamp: number;
  hits: number;
}

class AgentCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 1000 * 60 * 60; // 1 hora
  private readonly MAX_ENTRIES = 100;

  /**
   * Obtener del cache
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Verificar si expiró
    const edad = Date.now() - entry.timestamp;
    if (edad > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // Incrementar hits
    entry.hits++;
    
    return entry.resultado;
  }

  /**
   * Guardar en cache
   */
  set(key: string, resultado: any): void {
    // Limpiar cache si está lleno
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evict();
    }
    
    this.cache.set(key, {
      resultado,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Limpiar entradas menos usadas
   */
  private evict(): void {
    // Ordenar por hits (menos usados primero)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits);
    
    // Eliminar 20% menos usados
    const toRemove = Math.floor(this.MAX_ENTRIES * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Limpiar cache completo
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Estadísticas del cache
   */
  stats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      hitRate: entries.length > 0 ? totalHits / entries.length : 0
    };
  }
}

// Singleton global
export const agentCache = new AgentCache();

/**
 * Helper: Generar key de cache para búsquedas
 */
export function generateCacheKey(type: string, ...params: any[]): string {
  return `${type}:${params.map(p => JSON.stringify(p)).join(':')}`;
}
