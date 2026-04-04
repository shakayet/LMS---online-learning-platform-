import axios from 'axios';
import NodeCache from 'node-cache';
import {
  IOERResource,
  IOERSearchQuery,
  IOERSearchResponse,
  IOERSIResponse,
  IOERSIHit,
} from './oerResource.interface';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const OERSI_API_URL = 'https://oersi.org/resources/api/search/oer_data/_search';

const SUBJECT_MAP: Record<string, string> = {
  Mathematics: 'mathematics',
  Mathematik: 'mathematics',
  Biology: 'biology',
  Biologie: 'biology',
  History: 'history',
  Geschichte: 'history',
  'Computer Science': 'computer science',
  Informatik: 'computer science',
  Geography: 'geography',
  Geographie: 'geography',
  English: 'english',
  Englisch: 'english',
  German: 'german',
  Deutsch: 'german',
  Physics: 'physics',
  Physik: 'physics',
  Chemistry: 'chemistry',
  Chemie: 'chemistry',
};

const TYPE_MAP: Record<string, string> = {
  PDF: 'text',
  Video: 'video',
  Audio: 'audio',
  Interactive: 'application',
  Image: 'image',
};

const transformOERSIHit = (hit: IOERSIHit): IOERResource => {
  const source = hit._source;

  const subject =
    source.about?.[0]?.prefLabel?.de ||
    source.about?.[0]?.prefLabel?.en ||
    'General';

  const grade =
    source.educationalLevel?.[0]?.prefLabel?.de ||
    source.educationalLevel?.[0]?.prefLabel?.en ||
    '';

  const type =
    source.learningResourceType?.[0]?.prefLabel?.de ||
    source.learningResourceType?.[0]?.prefLabel?.en ||
    'Document';

  const author = source.creator?.[0]?.name || '';

  return {
    id: hit._id,
    title: source.name || 'Untitled',
    description: source.description || '',
    subject,
    grade,
    type,
    source: 'OERSI',
    url: source.id || '',
    thumbnail: source.image || undefined,
    author,
    license: source.license?.id || undefined,
    datePublished: source.datePublished || undefined,
    keywords: source.keywords || [],
  };
};

const buildElasticsearchQuery = (params: IOERSearchQuery) => {
  const { query, subject, grade, type, page = 1, limit = 20 } = params;

  const must: object[] = [];
  const filter: object[] = [];

  if (query && query.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: ['name^3', 'description^2', 'keywords', 'creator.name'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  if (subject) {
    const mappedSubject = SUBJECT_MAP[subject] || subject.toLowerCase();
    filter.push({
      bool: {
        should: [
          { match: { 'about.prefLabel.de': mappedSubject } },
          { match: { 'about.prefLabel.en': mappedSubject } },
          { match: { 'about.id': mappedSubject } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (grade) {
    filter.push({
      bool: {
        should: [
          { match: { 'educationalLevel.prefLabel.de': grade } },
          { match: { 'educationalLevel.prefLabel.en': grade } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (type) {
    const mappedType = TYPE_MAP[type] || type.toLowerCase();
    filter.push({
      bool: {
        should: [
          { match: { 'learningResourceType.prefLabel.de': mappedType } },
          { match: { 'learningResourceType.prefLabel.en': mappedType } },
          { match: { encoding: mappedType } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const esQuery: Record<string, unknown> = {
    from: (page - 1) * limit,
    size: limit,
    track_total_hits: true,
  };

  if (must.length > 0 || filter.length > 0) {
    esQuery.query = {
      bool: {
        ...(must.length > 0 ? { must } : { must: [{ match_all: {} }] }),
        ...(filter.length > 0 ? { filter } : {}),
      },
    };
  } else {

    esQuery.query = { match_all: {} };
    esQuery.sort = [{ datePublished: { order: 'desc' } }];
  }

  return esQuery;
};

const searchResources = async (
  params: IOERSearchQuery
): Promise<IOERSearchResponse> => {
  const { page = 1, limit = 20 } = params;

  const cacheKey = `oer_search_${JSON.stringify(params)}`;

  const cached = cache.get<IOERSearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const esQuery = buildElasticsearchQuery(params);

    const response = await axios.post<IOERSIResponse>(OERSI_API_URL, esQuery, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const { hits } = response.data;
    const total = hits.total.value;
    const resources = hits.hits.map(transformOERSIHit);

    const result: IOERSearchResponse = {
      resources,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    cache.set(cacheKey, result);

    return result;
  } catch (error) {

    if (axios.isAxiosError(error)) {
      console.error('OERSI API Error:', error.message);
    } else {
      console.error('OER Search Error:', error);
    }

    return {
      resources: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
};

const getAvailableSubjects = () => {
  return [
    { id: 'Mathematics', label: 'Mathematik', labelEn: 'Mathematics' },
    { id: 'German', label: 'Deutsch', labelEn: 'German' },
    { id: 'English', label: 'Englisch', labelEn: 'English' },
    { id: 'Biology', label: 'Biologie', labelEn: 'Biology' },
    { id: 'Chemistry', label: 'Chemie', labelEn: 'Chemistry' },
    { id: 'Physics', label: 'Physik', labelEn: 'Physics' },
    { id: 'History', label: 'Geschichte', labelEn: 'History' },
    { id: 'Geography', label: 'Geographie', labelEn: 'Geography' },
    { id: 'Computer Science', label: 'Informatik', labelEn: 'Computer Science' },
    { id: 'Art', label: 'Kunst', labelEn: 'Art' },
    { id: 'Music', label: 'Musik', labelEn: 'Music' },
    { id: 'Sport', label: 'Sport', labelEn: 'Sport' },
  ];
};

const getAvailableTypes = () => {
  return [
    { id: 'Video', label: 'Video' },
    { id: 'PDF', label: 'PDF / Document' },
    { id: 'Interactive', label: 'Interactive' },
    { id: 'Audio', label: 'Audio' },
    { id: 'Image', label: 'Image' },
  ];
};

const getAvailableGrades = () => {
  return [
    { id: 'Klasse 1-4', label: 'Klasse 1-4 (Grundschule)' },
    { id: 'Klasse 5-6', label: 'Klasse 5-6' },
    { id: 'Klasse 7-8', label: 'Klasse 7-8' },
    { id: 'Klasse 9-10', label: 'Klasse 9-10' },
    { id: 'Klasse 11-13', label: 'Klasse 11-13 (Oberstufe)' },
    { id: 'Berufsschule', label: 'Berufsschule' },
    { id: 'Hochschule', label: 'Hochschule' },
  ];
};

export const OERResourceService = {
  searchResources,
  getAvailableSubjects,
  getAvailableTypes,
  getAvailableGrades,
};
