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
Object.defineProperty(exports, "__esModule", { value: true });
const requestContext_1 = require("../logging/requestContext");
const date_fns_1 = require("date-fns");
class QueryBuilder {
    constructor(modelQuery, query) {
        this.modelQuery = modelQuery;
        this.query = query;
    }

    search(searchableFields) {
        var _a;
        if ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.searchTerm) {
            this.modelQuery = this.modelQuery.find({
                $or: searchableFields.map(field => ({
                    [field]: {
                        $regex: this.query.searchTerm,
                        $options: 'i',
                    },
                })),
            });
        }
        return this;
    }

    textSearch() {
        var _a;
        if ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.searchTerm) {
            const term = this.query.searchTerm;
            this.modelQuery = this.modelQuery.find({ $text: { $search: term } });
        }
        return this;
    }

    filter() {
        var _a;
        const queryObj = Object.assign({}, this.query);
        const excludeFields = [
            'searchTerm',
            'sort',
            'page',
            'limit',
            'fields',
            'timeFilter',
            'start',
            'end',
            'category',
            'latitude',
            'longitude',
            'distance',
        ];
        excludeFields.forEach(el => delete queryObj[el]);
        this.modelQuery = this.modelQuery.find(queryObj);

        if ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.category) {
            const categories = this.query.category
                .split(',')
                .map(cat => cat.trim());

            this.modelQuery = this.modelQuery.find(Object.assign(Object.assign({}, this.modelQuery.getFilter()), { taskCategory: { $in: categories } }));
        }
        return this;
    }

    locationFilter() {
        var _a, _b, _c;
        if (((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.latitude) && ((_b = this === null || this === void 0 ? void 0 : this.query) === null || _b === void 0 ? void 0 : _b.longitude) && ((_c = this === null || this === void 0 ? void 0 : this.query) === null || _c === void 0 ? void 0 : _c.distance)) {
            const lat = parseFloat(this.query.latitude);
            const lng = parseFloat(this.query.longitude);
            const distanceKm = parseFloat(this.query.distance);

            if (isNaN(lat) || isNaN(lng) || isNaN(distanceKm)) {
                throw new Error('Invalid latitude, longitude, or distance values');
            }
            if (lat < -90 || lat > 90) {
                throw new Error('Latitude must be between -90 and 90 degrees');
            }
            if (lng < -180 || lng > 180) {
                throw new Error('Longitude must be between -180 and 180 degrees');
            }
            if (distanceKm <= 0) {
                throw new Error('Distance must be greater than 0');
            }

            const latDelta = distanceKm / 111.32;
            const latRad = (lat * Math.PI) / 180;
            const cosLat = Math.cos(latRad);
            const lngDelta = distanceKm / (111.32 * (cosLat || 1e-6));
            const minLat = lat - latDelta;
            const maxLat = lat + latDelta;
            const minLng = lng - lngDelta;
            const maxLng = lng + lngDelta;
            this.modelQuery = this.modelQuery.find({
                latitude: { $gte: minLat, $lte: maxLat },
                longitude: { $gte: minLng, $lte: maxLng },
            });
        }
        return this;
    }

    geoNear() {
        var _a, _b, _c, _d, _e;
        const hasCoords = ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.latitude) && ((_b = this === null || this === void 0 ? void 0 : this.query) === null || _b === void 0 ? void 0 : _b.longitude);
        const hasMax = ((_c = this === null || this === void 0 ? void 0 : this.query) === null || _c === void 0 ? void 0 : _c.distance) || ((_d = this === null || this === void 0 ? void 0 : this.query) === null || _d === void 0 ? void 0 : _d.maxDistance);
        if (hasCoords && hasMax) {
            const lat = parseFloat(this.query.latitude);
            const lng = parseFloat(this.query.longitude);
            const field = ((_e = this === null || this === void 0 ? void 0 : this.query) === null || _e === void 0 ? void 0 : _e.geoField) || 'location';
            const maxKm = this.query.distance ? parseFloat(this.query.distance) : undefined;
            const maxMetersExplicit = this.query.maxDistance ? parseFloat(this.query.maxDistance) : undefined;
            const minKm = this.query.minDistance ? parseFloat(this.query.minDistance) : undefined;
            if (isNaN(lat) || isNaN(lng)) {
                throw new Error('Invalid latitude or longitude values');
            }
            if (lat < -90 || lat > 90) {
                throw new Error('Latitude must be between -90 and 90 degrees');
            }
            if (lng < -180 || lng > 180) {
                throw new Error('Longitude must be between -180 and 180 degrees');
            }
            const maxMeters = typeof maxKm === 'number' && !isNaN(maxKm)
                ? Math.max(0, maxKm * 1000)
                : (typeof maxMetersExplicit === 'number' && !isNaN(maxMetersExplicit) ? Math.max(0, maxMetersExplicit) : undefined);
            const minMeters = typeof minKm === 'number' && !isNaN(minKm)
                ? Math.max(0, minKm * 1000)
                : undefined;
            const nearClause = {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
            };
            if (typeof maxMeters === 'number') {
                nearClause.$maxDistance = maxMeters;
            }
            if (typeof minMeters === 'number') {
                nearClause.$minDistance = minMeters;
            }
            this.modelQuery = this.modelQuery.find(Object.assign(Object.assign({}, this.modelQuery.getFilter()), { [field]: { $near: nearClause } }));
        }
        return this;
    }

    geoWithinCircle() {
        var _a, _b, _c, _d, _e;
        if (((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.latitude) && ((_b = this === null || this === void 0 ? void 0 : this.query) === null || _b === void 0 ? void 0 : _b.longitude) && (((_c = this === null || this === void 0 ? void 0 : this.query) === null || _c === void 0 ? void 0 : _c.radius) || ((_d = this === null || this === void 0 ? void 0 : this.query) === null || _d === void 0 ? void 0 : _d.distance))) {
            const lat = parseFloat(this.query.latitude);
            const lng = parseFloat(this.query.longitude);
            const field = ((_e = this === null || this === void 0 ? void 0 : this.query) === null || _e === void 0 ? void 0 : _e.geoField) || 'location';
            const radiusKm = this.query.radius ? parseFloat(this.query.radius) : parseFloat(this.query.distance);
            if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
                throw new Error('Invalid latitude, longitude, or radius values');
            }
            if (lat < -90 || lat > 90) {
                throw new Error('Latitude must be between -90 and 90 degrees');
            }
            if (lng < -180 || lng > 180) {
                throw new Error('Longitude must be between -180 and 180 degrees');
            }
            if (radiusKm <= 0) {
                throw new Error('Radius must be greater than 0');
            }
            const earthRadiusKm = 6378.1;
            const radiusInRadians = radiusKm / earthRadiusKm;
            this.modelQuery = this.modelQuery.find(Object.assign(Object.assign({}, this.modelQuery.getFilter()), { [field]: { $geoWithin: { $centerSphere: [[lng, lat], radiusInRadians] } } }));
        }
        return this;
    }

    geoWithinBox() {
        var _a, _b, _c, _d, _e;
        const hasSW = ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.swLat) && ((_b = this === null || this === void 0 ? void 0 : this.query) === null || _b === void 0 ? void 0 : _b.swLng);
        const hasNE = ((_c = this === null || this === void 0 ? void 0 : this.query) === null || _c === void 0 ? void 0 : _c.neLat) && ((_d = this === null || this === void 0 ? void 0 : this.query) === null || _d === void 0 ? void 0 : _d.neLng);
        if (hasSW && hasNE) {
            const swLat = parseFloat(this.query.swLat);
            const swLng = parseFloat(this.query.swLng);
            const neLat = parseFloat(this.query.neLat);
            const neLng = parseFloat(this.query.neLng);
            const field = ((_e = this === null || this === void 0 ? void 0 : this.query) === null || _e === void 0 ? void 0 : _e.geoField) || 'location';
            if ([swLat, swLng, neLat, neLng].some(v => isNaN(v))) {
                throw new Error('Invalid bounding box coordinates');
            }
            if (swLat < -90 || swLat > 90 || neLat < -90 || neLat > 90) {
                throw new Error('Latitude must be between -90 and 90 degrees');
            }
            if (swLng < -180 || swLng > 180 || neLng < -180 || neLng > 180) {
                throw new Error('Longitude must be between -180 and 180 degrees');
            }
            this.modelQuery = this.modelQuery.find(Object.assign(Object.assign({}, this.modelQuery.getFilter()), { [field]: { $geoWithin: { $box: [[swLng, swLat], [neLng, neLat]] } } }));
        }
        return this;
    }

    geoWithinPolygon() {
        var _a, _b, _c;
        const field = ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.geoField) || 'location';
        const polygonRaw = ((_b = this === null || this === void 0 ? void 0 : this.query) === null || _b === void 0 ? void 0 : _b.polygon) || ((_c = this === null || this === void 0 ? void 0 : this.query) === null || _c === void 0 ? void 0 : _c.poly);
        if (!polygonRaw)
            return this;
        let coordinates = [];
        try {

            const parsed = JSON.parse(polygonRaw);
            if (Array.isArray(parsed)) {
                coordinates = parsed.map((pair) => [parseFloat(pair[0]), parseFloat(pair[1])]);
            }
        }
        catch (_d) {

            coordinates = polygonRaw.split(';')
                .map(p => p.trim())
                .filter(Boolean)
                .map(pairStr => {
                const [lngStr, latStr] = pairStr.split(',').map(s => s.trim());
                return [parseFloat(lngStr), parseFloat(latStr)];
            });
        }

        if (!Array.isArray(coordinates) || coordinates.length < 3) {
            throw new Error('Polygon must have at least 3 points');
        }

        coordinates.forEach(([lng, lat]) => {
            if (isNaN(lat) || isNaN(lng))
                throw new Error('Invalid polygon coordinates');
            if (lat < -90 || lat > 90)
                throw new Error('Latitude must be between -90 and 90 degrees');
            if (lng < -180 || lng > 180)
                throw new Error('Longitude must be between -180 and 180 degrees');
        });
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {

            coordinates.push([first[0], first[1]]);
        }
        this.modelQuery = this.modelQuery.find(Object.assign(Object.assign({}, this.modelQuery.getFilter()), { [field]: { $geoWithin: { $polygon: coordinates } } }));
        return this;
    }

    geoQuery() {
        var _a;
        const mode = ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.geoMode) || 'near';
        if (mode === 'near')
            return this.geoNear();
        if (mode === 'circle')
            return this.geoWithinCircle();
        if (mode === 'box')
            return this.geoWithinBox();
        if (mode === 'polygon')
            return this.geoWithinPolygon();
        return this;
    }

    dateFilter() {
        var _a;
        if ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.timeFilter) {
            const now = new Date();
            let dateRange = {};
            if (this.query.timeFilter === 'recently') {

                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                dateRange = { $gte: yesterday, $lte: now };
            }
            else if (this.query.timeFilter === 'weekly') {

                dateRange = {
                    $gte: (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }),
                    $lte: (0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1 }),
                };
            }
            else if (this.query.timeFilter === 'monthly') {

                dateRange = {
                    $gte: (0, date_fns_1.startOfMonth)(now),
                    $lte: (0, date_fns_1.endOfMonth)(now),
                };
            }
            else if (this.query.timeFilter === 'custom') {

                if (!this.query.start || !this.query.end) {
                    throw new Error("Custom date filter requires both 'start' and 'end' query parameters.");
                }
                const startDate = new Date(this.query.start);
                const endDate = new Date(this.query.end);
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    throw new Error("Invalid date format. Use 'YYYY-MM-DD' format for 'start' and 'end'.");
                }
                if (startDate > endDate) {
                    throw new Error("'start' date cannot be after 'end' date.");
                }
                dateRange = { $gte: startDate, $lte: endDate };
            }
            if (Object.keys(dateRange).length > 0) {
                this.modelQuery = this.modelQuery.find(Object.assign(Object.assign({}, this.modelQuery.getFilter()), { createdAt: dateRange }));
            }
        }
        return this;
    }

    sort() {
        var _a;
        let sort = ((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.sort) || '-createdAt';
        this.modelQuery = this.modelQuery.sort(sort);
        return this;
    }

    paginate() {
        var _a, _b;
        let limit = Number((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.limit) || 10;
        let page = Number((_b = this === null || this === void 0 ? void 0 : this.query) === null || _b === void 0 ? void 0 : _b.page) || 1;
        let skip = (page - 1) * limit;
        this.modelQuery = this.modelQuery.skip(skip).limit(limit);
        return this;
    }

    fields() {
        var _a, _b;
        let fields = ((_b = (_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b.split(',').join(' ')) || '-__v';
        this.modelQuery = this.modelQuery.select(fields);
        return this;
    }

    populate(populateFields, selectFields) {
        this.modelQuery = this.modelQuery.populate(populateFields.map(field => {
            var _a;
            return ({
                path: field,
                select: (_a = selectFields === null || selectFields === void 0 ? void 0 : selectFields[field]) !== null && _a !== void 0 ? _a : undefined,
            });
        }));
        return this;
    }

    populateWithMatch(path, matchConditions = {}, selectFields) {
        this.modelQuery = this.modelQuery.populate({
            path,
            match: matchConditions,
            select: selectFields !== null && selectFields !== void 0 ? selectFields : '-__v',
        });
        return this;
    }

    searchInPopulatedFields(path, searchableFields, searchTerm, additionalMatch = {}) {
        if (searchTerm) {
            const searchConditions = {
                $and: [
                    {
                        $or: searchableFields.map(field => ({
                            [field]: {
                                $regex: searchTerm,
                                $options: 'i',
                            },
                        })),
                    },
                    additionalMatch,
                ],
            };
            this.modelQuery = this.modelQuery.populate({
                path,
                match: searchConditions,
                select: '-__v',
            });
        }
        return this;
    }

    filterNullPopulatedFields() {
        return this;
    }

    getFilteredResults() {
        return __awaiter(this, arguments, void 0, function* (populatedFieldsToCheck = []) {
            var _a, _b;
            const _start = Date.now();
            const results = yield this.modelQuery;

            const filteredResults = results.filter((doc) => {
                if (populatedFieldsToCheck.length === 0) {
                    return true;
                }
                return populatedFieldsToCheck.every((fieldPath) => {
                    const value = doc.get ? doc.get(fieldPath) : doc[fieldPath];
                    return value !== null && value !== undefined;
                });
            });

            const total = filteredResults.length;
            const limit = Number((_a = this === null || this === void 0 ? void 0 : this.query) === null || _a === void 0 ? void 0 : _a.limit) || 10;
            const page = Number((_b = this === null || this === void 0 ? void 0 : this.query) === null || _b === void 0 ? void 0 : _b.page) || 1;
            const totalPage = Math.ceil(total / limit);
            const pagination = {
                total,
                limit,
                page,
                totalPage,
            };
            return {
                data: filteredResults,
                pagination,
            };
        });
    }

    getPaginationInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const _start = Date.now();
            const total = yield this.modelQuery.model.countDocuments(this.modelQuery.getFilter());
            const dur = Date.now() - _start;
            const modelName = ((_a = this.modelQuery.model) === null || _a === void 0 ? void 0 : _a.modelName) || ((_c = (_b = this.modelQuery.model) === null || _b === void 0 ? void 0 : _b.collection) === null || _c === void 0 ? void 0 : _c.name);
            (0, requestContext_1.recordDbQuery)(dur, { model: modelName, operation: 'countDocuments', cacheHit: false });
            const limit = Number((_d = this === null || this === void 0 ? void 0 : this.query) === null || _d === void 0 ? void 0 : _d.limit) || 10;
            const page = Number((_e = this === null || this === void 0 ? void 0 : this.query) === null || _e === void 0 ? void 0 : _e.page) || 1;
            const totalPage = Math.ceil(total / limit);
            return {
                total,
                limit,
                page,
                totalPage,
            };
        });
    }
}
exports.default = QueryBuilder;
