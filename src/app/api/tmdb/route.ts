/**
 * TMDB API Proxy Route
 *
 * Client components call this route instead of TMDB directly.
 * This keeps the API key server-side.
 *
 * Usage:
 *   GET /api/tmdb?path=search/multi&query=alien
 *   GET /api/tmdb?path=trending/movie/week&page=1
 *   GET /api/tmdb?path=movie/522931&append_to_response=credits,videos
 */

import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

// Allowed endpoints (whitelist for security)
const ALLOWED_PREFIXES = [
  'trending/',
  'movie/',
  'tv/',
  'search/',
  'discover/',
  'genre/',
];

function isAllowed(endpoint: string): boolean {
  return ALLOWED_PREFIXES.some(prefix => endpoint.startsWith(prefix));
}

export async function GET(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get('path');

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Missing endpoint parameter "path"' },
      { status: 400 },
    );
  }

  if (!isAllowed(endpoint)) {
    return NextResponse.json(
      { error: `Endpoint not allowed: ${endpoint}` },
      { status: 403 },
    );
  }

  const url = new URL(`${TMDB_BASE_URL}/${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);

  // Forward all other query params from the client request
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (key !== 'path' && key !== 'api_key') {
      url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }, // 1 minute for client-driven requests
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `TMDB API Error: ${response.status} ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[TMDB Proxy Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB' },
      { status: 500 },
    );
  }
}
