"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OERResourceService = void 0;
const axios_1 = __importDefault(require("axios"));
const node_cache_1 = __importDefault(require("node-cache"));
// Cache with 5 minute TTL
const cache = new node_cache_1.default({ stdTTL: 300, checkperiod: 60 });
const OERSI_API_URL = 'https://oersi.org/resources/api/search/oer_data/_search';
// Subject mapping for OERSI
const SUBJECT_MAP = {
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
// Resource type mapping
const TYPE_MAP = {
    PDF: 'text',
    Video: 'video',
    Audio: 'audio',
    Interactive: 'application',
    Image: 'image',
};
// Transform OERSI hit to our resource format
const transformOERSIHit = (hit) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    const source = hit._source;
    // Get subject from about field
    const subject = ((_c = (_b = (_a = source.about) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.prefLabel) === null || _c === void 0 ? void 0 : _c.de) ||
        ((_f = (_e = (_d = source.about) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.prefLabel) === null || _f === void 0 ? void 0 : _f.en) ||
        'General';
    // Get grade/educational level
    const grade = ((_j = (_h = (_g = source.educationalLevel) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.prefLabel) === null || _j === void 0 ? void 0 : _j.de) ||
        ((_m = (_l = (_k = source.educationalLevel) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.prefLabel) === null || _m === void 0 ? void 0 : _m.en) ||
        '';
    // Get resource type
    const type = ((_q = (_p = (_o = source.learningResourceType) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.prefLabel) === null || _q === void 0 ? void 0 : _q.de) ||
        ((_t = (_s = (_r = source.learningResourceType) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s.prefLabel) === null || _t === void 0 ? void 0 : _t.en) ||
        'Document';
    // Get author
    const author = ((_v = (_u = source.creator) === null || _u === void 0 ? void 0 : _u[0]) === null || _v === void 0 ? void 0 : _v.name) || '';
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
        license: ((_w = source.license) === null || _w === void 0 ? void 0 : _w.id) || undefined,
        datePublished: source.datePublished || undefined,
        keywords: source.keywords || [],
    };
};
// Build Elasticsearch query for OERSI
const buildElasticsearchQuery = (params) => {
    const { query, subject, grade, type, page = 1, limit = 20 } = params;
    const must = [];
    const filter = [];
    // Text search across multiple fields
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
    // Subject filter
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
    // Grade/educational level filter
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
    // Resource type filter
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
    // Build final query
    const esQuery = {
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true,
    };
    if (must.length > 0 || filter.length > 0) {
        esQuery.query = {
            bool: Object.assign(Object.assign({}, (must.length > 0 ? { must } : { must: [{ match_all: {} }] })), (filter.length > 0 ? { filter } : {})),
        };
    }
    else {
        // Default: get recent resources
        esQuery.query = { match_all: {} };
        esQuery.sort = [{ datePublished: { order: 'desc' } }];
    }
    return esQuery;
};
// Search resources from OERSI
const searchResources = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 20 } = params;
    // Generate cache key
    const cacheKey = `oer_search_${JSON.stringify(params)}`;
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }
    try {
        const esQuery = buildElasticsearchQuery(params);
        const response = yield axios_1.default.post(OERSI_API_URL, esQuery, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout
        });
        const { hits } = response.data;
        const total = hits.total.value;
        const resources = hits.hits.map(transformOERSIHit);
        const result = {
            resources,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
        // Cache the result
        cache.set(cacheKey, result);
        return result;
    }
    catch (error) {
        // Log error but don't expose details to client
        if (axios_1.default.isAxiosError(error)) {
            console.error('OERSI API Error:', error.message);
        }
        else {
            console.error('OER Search Error:', error);
        }
        // Return empty result on error
        return {
            resources: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
        };
    }
});
// Get available subjects (static list based on common German school subjects)
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
// Get available resource types
const getAvailableTypes = () => {
    return [
        { id: 'Video', label: 'Video' },
        { id: 'PDF', label: 'PDF / Document' },
        { id: 'Interactive', label: 'Interactive' },
        { id: 'Audio', label: 'Audio' },
        { id: 'Image', label: 'Image' },
    ];
};
// Get available grades
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
exports.OERResourceService = {
    searchResources,
    getAvailableSubjects,
    getAvailableTypes,
    getAvailableGrades,
};
