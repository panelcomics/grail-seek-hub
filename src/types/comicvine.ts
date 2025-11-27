// ComicVine API Types

export interface ComicVineVolume {
  id: number;
  name: string;
  publisher: {
    name: string;
  } | null;
  start_year: number | null;
  count_of_issues?: number;
  image?: {
    original_url: string;
    medium_url: string;
    small_url: string;
  };
}

export interface ComicVineIssue {
  id: number;
  name: string | null;
  issue_number: string;
  volume: {
    id: number;
    name: string;
  };
  cover_date: string | null;
  image: {
    original_url: string;
    medium_url: string;
    small_url: string;
  };
  person_credits?: Array<{
    name: string;
    role: string;
  }>;
  description?: string | null;
}

export interface ComicVinePick {
  id: number;
  resource: 'issue' | 'volume';
  title: string;
  issue: string | null;
  year: number | null;
  publisher?: string | null;
  volumeName?: string | null;
  volumeId?: number | null;
  variantDescription?: string | null;
  thumbUrl: string;
  coverUrl: string;
  writer?: string | null;
  artist?: string | null;
  coverArtist?: string | null;
  score: number;
  isReprint: boolean;
  source?: 'comicvine' | 'cache' | 'gcd';
  description?: string | null;
  deck?: string | null;
  characters?: string | null;
  keyNotes?: string | null;
}

export interface GroupedResults {
  volume: {
    id: number;
    name: string;
    publisher: string;
    yearRange: string;
  };
  issues: ComicVinePick[];
}
