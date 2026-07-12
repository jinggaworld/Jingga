export interface OpenAlexWork {
  id: string;
  title: string;
  authors: string[];
  publicationDate: string;
  source: string;
  citedByCount: number;
  isOpenAccess: boolean;
  pdfUrl?: string;
  abstract: string;
  doi?: string;
}

const USER_AGENT = 'Jingga/1.0 (mailto:hello@jingga.app)';
const OPENALEX_BASE = 'https://api.openalex.org';

// Search works by query
export async function searchWorks(query: string, perPage: number = 5): Promise<OpenAlexWork[]> {
  try {
    const url = `${OPENALEX_BASE}/works?search=${encodeURIComponent(query)}&per_page=${perPage}&sort=relevance:desc`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) return [];

    const data: any = await response.json();
    const results = data.results || [];

    return results.map((work: any) => ({
      id: work.id || '',
      title: work.title || '',
      authors: (work.authorships || []).map((a: any) => a.author?.display_name || '').filter(Boolean),
      publicationDate: work.publication_date || '',
      source: work.primary_location?.source?.display_name || work.primary_location?.source?.publisher || '',
      citedByCount: work.cited_by_count || 0,
      isOpenAccess: work.open_access?.is_oa || false,
      pdfUrl: work.open_access?.oa_url || work.primary_location?.pdf_url || undefined,
      abstract: reconstructAbstract(work.abstract_inverted_index),
      doi: work.doi || undefined,
    }));
  } catch (err) {
    console.error('[OpenAlex] Search error:', err);
    return [];
  }
}

// Get a single work by OpenAlex ID
export async function getWork(id: string): Promise<OpenAlexWork | null> {
  try {
    const url = `${OPENALEX_BASE}/works/${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) return null;

    const work: any = await response.json();

    return {
      id: work.id || '',
      title: work.title || '',
      authors: (work.authorships || []).map((a: any) => a.author?.display_name || '').filter(Boolean),
      publicationDate: work.publication_date || '',
      source: work.primary_location?.source?.display_name || '',
      citedByCount: work.cited_by_count || 0,
      isOpenAccess: work.open_access?.is_oa || false,
      pdfUrl: work.open_access?.oa_url || undefined,
      abstract: reconstructAbstract(work.abstract_inverted_index),
      doi: work.doi || undefined,
    };
  } catch (err) {
    console.error('[OpenAlex] Get work error:', err);
    return null;
  }
}

// Reconstruct abstract from OpenAlex inverted index format
function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
  if (!invertedIndex) return '';

  const words: { word: string; position: number }[] = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push({ word, position: pos });
    }
  }

  words.sort((a, b) => a.position - b.position);
  return words.map((w) => w.word).join(' ');
}
