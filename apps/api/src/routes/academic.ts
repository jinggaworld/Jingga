import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { searchByDOI, searchByTitle } from '../services/crossref';
import { searchWorks as searchOpenAlex } from '../services/openalex';
import { checkPlagiarism } from '../services/plagiarismCheck';

const router: ReturnType<typeof Router> = Router();

// ============================================================
// CrossRef Endpoints
// ============================================================

// POST /api/v1/academic/crossref/lookup — Lookup by DOI
router.post('/crossref/lookup', async (req: Request, res: Response) => {
  try {
    const { doi } = req.body;
    if (!doi) {
      res.status(400).json({ error: 'doi is required' });
      return;
    }

    const metadata = await searchByDOI(doi);

    if (!metadata) {
      res.json({ found: false, metadata: null });
      return;
    }

    res.json({ found: true, metadata });
  } catch (error) {
    console.error('[Academic] CrossRef lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup DOI' });
  }
});

// POST /api/v1/academic/crossref/search — Search by title
router.post('/crossref/search', async (req: Request, res: Response) => {
  try {
    const { query, limit } = req.body;
    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    const results = await searchByTitle(query, limit || 5);
    res.json({ results });
  } catch (error) {
    console.error('[Academic] CrossRef search error:', error);
    res.status(500).json({ error: 'Failed to search CrossRef' });
  }
});

// ============================================================
// OpenAlex Endpoints
// ============================================================

// POST /api/v1/academic/openalex/search — Search OpenAlex
router.post('/openalex/search', async (req: Request, res: Response) => {
  try {
    const { query, limit } = req.body;
    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    const results = await searchOpenAlex(query, limit || 5);
    res.json({ results });
  } catch (error) {
    console.error('[Academic] OpenAlex search error:', error);
    res.status(500).json({ error: 'Failed to search OpenAlex' });
  }
});

// ============================================================
// Plagiarism Check Endpoint (requires auth)
// ============================================================

// POST /api/v1/academic/plagiarism-check — Check for plagiarism
router.post('/plagiarism-check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const result = await checkPlagiarism(title, description || '');
    res.json({ result });
  } catch (error) {
    console.error('[Academic] Plagiarism check error:', error);
    res.status(500).json({ error: 'Failed to check plagiarism' });
  }
});

// POST /api/v1/academic/metadata-fill — Auto-fill metadata from CrossRef/OpenAlex
router.post('/metadata-fill', async (req: Request, res: Response) => {
  try {
    const { doi, title, source } = req.body;

    if (doi) {
      // Lookup by DOI via CrossRef
      const metadata = await searchByDOI(doi);
      if (metadata) {
        res.json({ metadata, source: 'crossref' });
        return;
      }
    }

    if (title) {
      if (source === 'openalex') {
        // Search OpenAlex
        const results = await searchOpenAlex(title, 1);
        if (results.length > 0) {
          const work = results[0];
          res.json({
            metadata: {
              title: work.title,
              authors: work.authors,
              abstract: work.abstract,
              journal: work.source,
              citationCount: work.citedByCount,
              doi: work.doi,
              source: 'openalex',
            },
            source: 'openalex',
          });
          return;
        }
      } else {
        // Search CrossRef by title
        const results = await searchByTitle(title, 1);
        if (results.length > 0) {
          res.json({ metadata: results[0], source: 'crossref' });
          return;
        }
      }
    }

    res.json({ found: false, metadata: null });
  } catch (error) {
    console.error('[Academic] Metadata fill error:', error);
    res.status(500).json({ error: 'Failed to fill metadata' });
  }
});

export default router;
