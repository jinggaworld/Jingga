const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
const CROSSREF_BASE = 'https://api.crossref.org';

export interface PlagiarismMatch {
  title: string;
  authors: string[];
  publishedDate: string;
  description: string;
  thumbnail?: string;
  similarityScore: number; // 0–100
  previewLink?: string;
  infoLink?: string;
  source: 'google_books' | 'crossref';
}

export interface PlagiarismCheckResult {
  query: string;
  totalMatches: number;
  matches: PlagiarismMatch[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  checkedAt: string;
}

// Main plagiarism check function
export async function checkPlagiarism(
  title: string,
  description?: string
): Promise<PlagiarismCheckResult> {
  const text = description || title;

  // 1. Search Google Books by title + key phrases
  const bookPromises = [
    searchGoogleBooks(title, 5),
    ...extractKeyPhrases(text, 3).map((phrase) => searchGoogleBooks(phrase, 3)),
  ];
  const bookResults = await Promise.all(bookPromises);
  const allBooks = bookResults.flat();

  // 2. Search CrossRef by title
  let crossrefResults: PlagiarismMatch[] = [];
  try {
    const response = await fetch(
      `${CROSSREF_BASE}/works?query.title=${encodeURIComponent(title)}&rows=5&sort=relevance`,
      { headers: { 'User-Agent': 'Jingga/1.0 (mailto:hello@jingga.app)' } }
    );
    if (response.ok) {
      const data: any = await response.json();
      crossrefResults = (data.message?.items || []).map((item: any) => ({
        title: item.title?.[0] || '',
        authors: (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean),
        publishedDate: item.published?.['date-parts']?.[0]?.join('-') || '',
        description: stripHtml(item.abstract || ''),
        similarityScore: 0,
        previewLink: item.URL || `https://doi.org/${item.DOI}`,
        infoLink: item.URL || `https://doi.org/${item.DOI}`,
        source: 'crossref' as const,
      }));
    }
  } catch {
    // CrossRef search is optional
  }

  // 3. Deduplicate and score
  const allMatches = [...deduplicate(allBooks), ...deduplicate(crossrefResults)];
  const scoredMatches = scoreMatches(title, text, allMatches);

  // 4. Determine risk level
  const maxScore = scoredMatches.length > 0 ? Math.max(...scoredMatches.map((m) => m.similarityScore)) : 0;
  const riskLevel: 'low' | 'medium' | 'high' = maxScore > 80 ? 'high' : maxScore > 50 ? 'medium' : 'low';

  // 5. Generate recommendation
  const recommendation = generateRecommendation(riskLevel, scoredMatches.length);

  return {
    query: title,
    totalMatches: scoredMatches.length,
    matches: scoredMatches.slice(0, 10), // top 10
    riskLevel,
    recommendation,
    checkedAt: new Date().toISOString(),
  };
}

// Search Google Books API
async function searchGoogleBooks(query: string, maxResults: number): Promise<PlagiarismMatch[]> {
  if (!GOOGLE_BOOKS_API_KEY) return []; // No API key configured

  try {
    const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${GOOGLE_BOOKS_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: any = await response.json();
    return (data.items || []).map((item: any) => ({
      title: item.volumeInfo?.title || '',
      authors: item.volumeInfo?.authors || [],
      publishedDate: item.volumeInfo?.publishedDate || '',
      description: (item.volumeInfo?.description || '').slice(0, 300),
      thumbnail: item.volumeInfo?.imageLinks?.thumbnail,
      similarityScore: 0, // calculated later by scoreMatches
      previewLink: item.volumeInfo?.previewLink,
      infoLink: item.volumeInfo?.infoLink,
      source: 'google_books' as const,
    }));
  } catch {
    return [];
  }
}

// Extract key phrases from text for broader matching
function extractKeyPhrases(text: string, maxPhrases: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 4);
  const phrases: string[] = [];

  for (let i = 0; i < Math.min(words.length - 2, maxPhrases); i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return phrases;
}

// Deduplicate matches by title
function deduplicate(matches: PlagiarismMatch[]): PlagiarismMatch[] {
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = m.title.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Score similarity based on title and description overlap
function scoreMatches(
  originalTitle: string,
  originalDescription: string,
  matches: PlagiarismMatch[]
): PlagiarismMatch[] {
  return matches
    .map((match) => {
      const titleSimilarity = jaccardSimilarity(originalTitle.toLowerCase(), match.title.toLowerCase());
      const descSimilarity = originalDescription
        ? jaccardSimilarity(
            originalDescription.toLowerCase().slice(0, 200),
            match.description.toLowerCase().slice(0, 200)
          )
        : 0;

      return {
        ...match,
        similarityScore: Math.round((titleSimilarity * 0.7 + descSimilarity * 0.3) * 100),
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

// Jaccard similarity on word sets
function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]);
  return intersection / union.size;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

function generateRecommendation(riskLevel: string, matchCount: number): string {
  switch (riskLevel) {
    case 'high':
      return `Found ${matchCount} work(s) with high similarity. Ensure your work is original and provide proper citations.`;
    case 'medium':
      return `Found ${matchCount} work(s) with moderate similarity. Consider adding citations or references.`;
    case 'low':
      return `No significant similarity found. Your work appears original.`;
    default:
      return '';
  }
}
