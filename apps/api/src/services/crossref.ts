export interface CrossRefWork {
  doi: string;
  title: string;
  authors: string[];
  publishedDate: string;
  journal: string;
  abstract: string;
  citationCount: number;
  url: string;
  publisher: string;
}

const USER_AGENT = 'Jingga/1.0 (mailto:hello@jingga.app)';
const CROSSREF_BASE = 'https://api.crossref.org';

// Lookup work by DOI
export async function searchByDOI(doi: string): Promise<CrossRefWork | null> {
  try {
    const response = await fetch(`${CROSSREF_BASE}/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    const work = data.message;
    if (!work) return null;

    return {
      doi: work.DOI || doi,
      title: work.title?.[0] || '',
      authors: (work.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean),
      publishedDate: work.published?.['date-parts']?.[0]?.join('-') || '',
      journal: work['container-title']?.[0] || work['publisher'] || '',
      abstract: stripHtmlTags(work.abstract || ''),
      citationCount: work['is-referenced-by-count'] || 0,
      url: work.URL || `https://doi.org/${work.DOI}`,
      publisher: work.publisher || '',
    };
  } catch (err) {
    console.error('[CrossRef] DOI lookup error:', err);
    return null;
  }
}

// Search works by title
export async function searchByTitle(query: string, rows: number = 5): Promise<CrossRefWork[]> {
  try {
    const url = `${CROSSREF_BASE}/works?query.title=${encodeURIComponent(query)}&rows=${rows}&sort=relevance&order=desc`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) return [];

    const data: any = await response.json();
    const items = data.message?.items || [];

    return items.map((item: any) => ({
      doi: item.DOI || '',
      title: item.title?.[0] || '',
      authors: (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean),
      publishedDate: item.published?.['date-parts']?.[0]?.join('-') || '',
      journal: item['container-title']?.[0] || item.publisher || '',
      abstract: stripHtmlTags(item.abstract || ''),
      citationCount: item['is-referenced-by-count'] || 0,
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
      publisher: item.publisher || '',
    }));
  } catch (err) {
    console.error('[CrossRef] Search error:', err);
    return [];
  }
}

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}
