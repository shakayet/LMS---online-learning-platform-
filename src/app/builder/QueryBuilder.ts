import { FilterQuery, Query } from 'mongoose';
import { recordDbQuery } from '../logging/requestContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchableFields: string[]) {
    if (this?.query?.searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          field =>
            ({
              [field]: {
                $regex: this.query.searchTerm,
                $options: 'i',
              },
            } as FilterQuery<T>)
        ),
      });
    }
    return this;
  }

  textSearch() {
    if (this?.query?.searchTerm) {
      const term = this.query.searchTerm as string;
      this.modelQuery = this.modelQuery.find({ $text: { $search: term } } as FilterQuery<T>);
    }
    return this;
  }

  filter() {
    const queryObj = { ...this.query };
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

    this.modelQuery = this.modelQuery.find(queryObj as FilterQuery<T>);

    if (this?.query?.category) {
      const categories = (this.query.category as string)
        .split(',')
        .map(cat => cat.trim());

      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        taskCategory: { $in: categories },
      } as FilterQuery<T>);
    }

    return this;
  }

  locationFilter() {
    if (this?.query?.latitude && this?.query?.longitude && this?.query?.distance) {
      const lat = parseFloat(this.query.latitude as string);
      const lng = parseFloat(this.query.longitude as string);
      const distanceKm = parseFloat(this.query.distance as string);

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
      } as FilterQuery<T>);
    }

    return this;
  }

  geoNear() {
    const hasCoords = this?.query?.latitude && this?.query?.longitude;
    const hasMax = this?.query?.distance || this?.query?.maxDistance;
    if (hasCoords && hasMax) {
      const lat = parseFloat(this.query.latitude as string);
      const lng = parseFloat(this.query.longitude as string);
      const field = (this?.query?.geoField as string) || 'location';
      const maxKm = this.query.distance ? parseFloat(this.query.distance as string) : undefined;
      const maxMetersExplicit = this.query.maxDistance ? parseFloat(this.query.maxDistance as string) : undefined;
      const minKm = this.query.minDistance ? parseFloat(this.query.minDistance as string) : undefined;

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

      const nearClause: Record<string, unknown> = {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
      };
      if (typeof maxMeters === 'number') {
        (nearClause as any).$maxDistance = maxMeters;
      }
      if (typeof minMeters === 'number') {
        (nearClause as any).$minDistance = minMeters;
      }

      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        [field]: { $near: nearClause },
      } as FilterQuery<T>);
    }
    return this;
  }

  geoWithinCircle() {
    if (this?.query?.latitude && this?.query?.longitude && (this?.query?.radius || this?.query?.distance)) {
      const lat = parseFloat(this.query.latitude as string);
      const lng = parseFloat(this.query.longitude as string);
      const field = (this?.query?.geoField as string) || 'location';
      const radiusKm = this.query.radius ? parseFloat(this.query.radius as string) : parseFloat(this.query.distance as string);

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

      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        [field]: { $geoWithin: { $centerSphere: [[lng, lat], radiusInRadians] } },
      } as FilterQuery<T>);
    }
    return this;
  }

  geoWithinBox() {
    const hasSW = this?.query?.swLat && this?.query?.swLng;
    const hasNE = this?.query?.neLat && this?.query?.neLng;
    if (hasSW && hasNE) {
      const swLat = parseFloat(this.query.swLat as string);
      const swLng = parseFloat(this.query.swLng as string);
      const neLat = parseFloat(this.query.neLat as string);
      const neLng = parseFloat(this.query.neLng as string);
      const field = (this?.query?.geoField as string) || 'location';

      if ([swLat, swLng, neLat, neLng].some(v => isNaN(v))) {
        throw new Error('Invalid bounding box coordinates');
      }
      if (swLat < -90 || swLat > 90 || neLat < -90 || neLat > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
      if (swLng < -180 || swLng > 180 || neLng < -180 || neLng > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        [field]: { $geoWithin: { $box: [[swLng, swLat], [neLng, neLat]] } },
      } as FilterQuery<T>);
    }
    return this;
  }

  geoWithinPolygon() {
    const field = (this?.query?.geoField as string) || 'location';
    const polygonRaw = (this?.query?.polygon as string) || (this?.query?.poly as string);
    if (!polygonRaw) return this;

    let coordinates: Array<[number, number]> = [];
    try {

      const parsed = JSON.parse(polygonRaw);
      if (Array.isArray(parsed)) {
        coordinates = parsed.map((pair: any) => [parseFloat(pair[0]), parseFloat(pair[1])]);
      }
    } catch {

      coordinates = polygonRaw.split(';')
        .map(p => p.trim())
        .filter(Boolean)
        .map(pairStr => {
          const [lngStr, latStr] = pairStr.split(',').map(s => s.trim());
          return [parseFloat(lngStr), parseFloat(latStr)] as [number, number];
        });
    }

    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      throw new Error('Polygon must have at least 3 points');
    }

    coordinates.forEach(([lng, lat]) => {
      if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid polygon coordinates');
      if (lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90 degrees');
      if (lng < -180 || lng > 180) throw new Error('Longitude must be between -180 and 180 degrees');
    });

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {

      coordinates.push([first[0], first[1]]);
    }

    this.modelQuery = this.modelQuery.find({
      ...this.modelQuery.getFilter(),
      [field]: { $geoWithin: { $polygon: coordinates } },
    } as FilterQuery<T>);

    return this;
  }

  geoQuery() {
    const mode = (this?.query?.geoMode as string) || 'near';
    if (mode === 'near') return this.geoNear();
    if (mode === 'circle') return this.geoWithinCircle();
    if (mode === 'box') return this.geoWithinBox();
    if (mode === 'polygon') return this.geoWithinPolygon();
    return this;
  }

  dateFilter() {
    if (this?.query?.timeFilter) {
      const now = new Date();
      let dateRange: Record<string, Date> = {};

      if (this.query.timeFilter === 'recently') {

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        dateRange = { $gte: yesterday, $lte: now };
      } else if (this.query.timeFilter === 'weekly') {

        dateRange = {
          $gte: startOfWeek(now, { weekStartsOn: 1 }),
          $lte: endOfWeek(now, { weekStartsOn: 1 }),
        };
      } else if (this.query.timeFilter === 'monthly') {

        dateRange = {
          $gte: startOfMonth(now),
          $lte: endOfMonth(now),
        };
      } else if (this.query.timeFilter === 'custom') {

        if (!this.query.start || !this.query.end) {
          throw new Error(
            "Custom date filter requires both 'start' and 'end' query parameters."
          );
        }

        const startDate = new Date(this.query.start as string);
        const endDate = new Date(this.query.end as string);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error(
            "Invalid date format. Use 'YYYY-MM-DD' format for 'start' and 'end'."
          );
        }

        if (startDate > endDate) {
          throw new Error("'start' date cannot be after 'end' date.");
        }

        dateRange = { $gte: startDate, $lte: endDate };
      }

      if (Object.keys(dateRange).length > 0) {
        this.modelQuery = this.modelQuery.find({
          ...this.modelQuery.getFilter(),
          createdAt: dateRange,
        });
      }
    }

    return this;
  }

  sort() {
    let sort = (this?.query?.sort as string) || '-createdAt';
    this.modelQuery = this.modelQuery.sort(sort);
    return this;
  }

  paginate() {
    let limit = Number(this?.query?.limit) || 10;
    let page = Number(this?.query?.page) || 1;
    let skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields() {
    let fields =
      (this?.query?.fields as string)?.split(',').join(' ') || '-__v';
    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  populate(populateFields: string[], selectFields?: Record<string, unknown>) {
    this.modelQuery = this.modelQuery.populate(
      populateFields.map(field => ({
        path: field,
        select: selectFields?.[field] ?? undefined,
      }))
    );
    return this;
  }

  populateWithMatch(
    path: string,
    matchConditions: Record<string, unknown> = {},
    selectFields?: string
  ) {
    this.modelQuery = this.modelQuery.populate({
      path,
      match: matchConditions,
      select: selectFields ?? '-__v',
    });
    return this;
  }

  searchInPopulatedFields(
    path: string,
    searchableFields: string[],
    searchTerm: string,
    additionalMatch: Record<string, unknown> = {}
  ) {
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

  async getFilteredResults(populatedFieldsToCheck: string[] = []) {
    const _start = Date.now();
    const results = await this.modelQuery;

    const filteredResults = results.filter((doc: any) => {
      if (populatedFieldsToCheck.length === 0) {
        return true;
      }

      return populatedFieldsToCheck.every((fieldPath: string) => {
        const value = doc.get ? doc.get(fieldPath) : doc[fieldPath];
        return value !== null && value !== undefined;
      });
    });

    const total = filteredResults.length;
    const limit = Number(this?.query?.limit) || 10;
    const page = Number(this?.query?.page) || 1;
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
  }

  async getPaginationInfo() {
    const _start = Date.now();
    const total = await this.modelQuery.model.countDocuments(
      this.modelQuery.getFilter()
    );
    const dur = Date.now() - _start;
    const modelName = (this.modelQuery.model as any)?.modelName || (this.modelQuery.model as any)?.collection?.name;
    recordDbQuery(dur, { model: modelName, operation: 'countDocuments', cacheHit: false });
    const limit = Number(this?.query?.limit) || 10;
    const page = Number(this?.query?.page) || 1;
    const totalPage = Math.ceil(total / limit);

    return {
      total,
      limit,
      page,
      totalPage,
    };
  }
}

export default QueryBuilder;
