// OER Resource Types

export type IOERResource = {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  type: string; // PDF, Video, Interactive, Audio, etc.
  source: string; // OERSI, WLO, MUNDO, etc.
  url: string;
  thumbnail?: string;
  author?: string;
  license?: string;
  datePublished?: string;
  keywords?: string[];
};

export type IOERSearchQuery = {
  query?: string;
  subject?: string;
  grade?: string;
  type?: string;
  page?: number;
  limit?: number;
};

export type IOERSearchResponse = {
  resources: IOERResource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// OERSI Elasticsearch Response Types
export type IOERSIHit = {
  _id: string;
  _source: {
    id: string;
    name: string;
    description?: string;
    about?: Array<{
      id?: string;
      prefLabel?: {
        de?: string;
        en?: string;
      };
    }>;
    educationalLevel?: Array<{
      id?: string;
      prefLabel?: {
        de?: string;
        en?: string;
      };
    }>;
    learningResourceType?: Array<{
      id?: string;
      prefLabel?: {
        de?: string;
        en?: string;
      };
    }>;
    image?: string;
    creator?: Array<{
      name?: string;
      type?: string;
    }>;
    license?: {
      id?: string;
    };
    datePublished?: string;
    keywords?: string[];
    sourceOrganization?: Array<{
      name?: string;
    }>;
  };
};

export type IOERSIResponse = {
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: IOERSIHit[];
  };
};
