import Constants from 'expo-constants';

import { DeviceOption, FuelEvent, FuelReport, PositionItem, UserSession } from '@/types';
import { toNumber } from '@/utils/format';

const extra = Constants.expoConfig?.extra ?? {};
const envBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (typeof extra === 'object' && extra && 'apiBaseUrl' in extra
    ? String((extra as Record<string, unknown>).apiBaseUrl)
    : '');

export const API_BASE_URL = envBaseUrl || 'http://3.19.86.247:5000';

type RequestOptions = RequestInit & {
  token?: string;
};

function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null
        ? String(
            (payload as Record<string, unknown>).detail ||
              (payload as Record<string, unknown>).message ||
              (payload as Record<string, unknown>).error ||
              `HTTP ${response.status}`,
          )
        : `HTTP ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

type LoginInput = {
  username: string;
  password: string;
};

export async function loginRequest(input: LoginInput): Promise<UserSession> {
  const payload = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return normalizeLoginResponse(payload, input.username);
}

function normalizeLoginResponse(payload: unknown, fallbackUsername: string): UserSession {
  const data =
    (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>;
  const token = String(data.access_token || data.token || data.jwt || data.auth_token || '').trim();

  if (!token) {
    throw new Error('La respuesta de login no incluye token.');
  }

  const user =
    (typeof data.user === 'object' && data.user !== null ? data.user : {}) as Record<string, unknown>;

  return {
    username: String(user.username || data.username || data.user_name || fallbackUsername),
    role: String(user.role || data.role || 'Operador'),
    token,
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
  };
}

function parsePossibleRecord(candidate: unknown): Record<string, unknown> {
  if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
    return candidate as Record<string, unknown>;
  }

  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function getArrayCandidate(payload: unknown, keys: string[] = []): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (typeof payload !== 'object' || payload === null) return [];

  const record = payload as Record<string, unknown>;

  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) return value as unknown[];
  }

  return [];
}

function pickNestedRecord(...candidates: unknown[]): Record<string, unknown> {
  for (const candidate of candidates) {
    const parsed = parsePossibleRecord(candidate);
    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  }

  return {};
}

function resolveFuelMetaRecord(source: unknown): Record<string, unknown> {
  const root = parsePossibleRecord(source);
  if (Object.keys(root).length === 0) return {};

  const raw = parsePossibleRecord(root.raw);
  const data = parsePossibleRecord(root.data);
  const payload = parsePossibleRecord(root.payload);

  return (
    [
      raw,
      raw.raw,
      raw.data,
      raw.payload,
      data,
      data.raw,
      data.data,
      data.payload,
      payload,
      payload.raw,
      payload.data,
      payload.payload,
      root,
    ]
      .map(parsePossibleRecord)
      .find((obj) => Object.keys(obj).length > 0) || {}
  );
}

function firstDefined<T = unknown>(...values: unknown[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value as T;
    }
  }

  return undefined;
}

function normalizeTextValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  const text = String(value).trim();
  return text ? text : undefined;
}

function firstNonEmptyText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = normalizeTextValue(value);
    if (text) return text;
  }

  return undefined;
}

function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = toNumber(value, NaN);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function keyLooksLikeAddress(key: string): boolean {
  const normalized = key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return [
    'address',
    'addr',
    'direccion',
    'direc',
    'dir',
    'ubicacion',
    'ubic',
    'location',
    'street',
    'road',
    'route',
    'calle',
    'avenida',
    'camino',
    'ruta',
    'pasaje',
    'sector',
    'villa',
    'displayaddress',
    'formattedaddress',
    'lastaddress',
  ].some((part) => normalized.includes(part));
}

function looksLikeAddressText(value: unknown): string | undefined {
  const text = normalizeTextValue(value);
  if (!text) return undefined;

  const lower = text.toLowerCase();

  if (text.length < 8) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return undefined;
  if (/^[0-9a-f]{10,}$/i.test(text)) return undefined;
  if (/^[\d\s:/.\-apm]+$/i.test(text)) return undefined;

  if (text.includes(',') && /[a-záéíóúñ]/i.test(text)) {
    return text;
  }

  if (
    /(avenida|av\.|calle|camino|ruta|pasaje|villa|poblaci[oó]n|sector|condominio|km\s*\d+|parcela|le[oó]n|gallo|dittborn|neruda)/i.test(
      lower,
    )
  ) {
    return text;
  }

  return undefined;
}

function deepFindLikelyAddress(
  source: unknown,
  depth = 0,
  seen = new Set<unknown>(),
): string | undefined {
  if (depth > 8 || source === null || source === undefined) return undefined;

  const parsed = parsePossibleRecord(source);
  if (Object.keys(parsed).length > 0) {
    if (seen.has(parsed)) return undefined;
    seen.add(parsed);

    for (const [key, value] of Object.entries(parsed)) {
      if (keyLooksLikeAddress(key)) {
        const direct = looksLikeAddressText(value) || normalizeTextValue(value);
        if (direct) return direct;
      }
    }

    for (const value of Object.values(parsed)) {
      const found = deepFindLikelyAddress(value, depth + 1, seen);
      if (found) return found;
    }

    for (const value of Object.values(parsed)) {
      const fallback = looksLikeAddressText(value);
      if (fallback) return fallback;
    }

    return undefined;
  }

  if (Array.isArray(source)) {
    if (seen.has(source)) return undefined;
    seen.add(source);

    for (const item of source) {
      const found = deepFindLikelyAddress(item, depth + 1, seen);
      if (found) return found;
    }

    return undefined;
  }

  return looksLikeAddressText(source);
}

function normalizePositionItem(item: unknown, index: number): PositionItem | null {
  if (typeof item !== 'object' || item === null) return null;

  const record = item as Record<string, unknown>;
  const nestedPosition = pickNestedRecord(record.position, record.gps, record.location, record.coords);
  const latestData = pickNestedRecord(
    record.latest_data,
    record.latestData,
    record.ultimo_dato,
    record.last_data,
    record.lastData,
    record.telemetry,
    record.variables,
    record.values,
    record.data,
  );

  const latitude = toNumber(
    firstDefined(
      record.lat,
      record.latitude,
      nestedPosition.lat,
      nestedPosition.latitude,
      latestData.gps_lat,
      latestData.lat,
      latestData.latitude,
    ),
    NaN,
  );
  const longitude = toNumber(
    firstDefined(
      record.lng,
      record.lon,
      record.longitude,
      nestedPosition.lng,
      nestedPosition.lon,
      nestedPosition.longitude,
      latestData.gps_lng,
      latestData.lng,
      latestData.lon,
      latestData.longitude,
    ),
    NaN,
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const speed = toNumber(
    firstDefined(
      record.speed,
      record.velocity,
      nestedPosition.speed,
      latestData.speed,
      latestData.velocidad,
    ),
    0,
  );

  const moving =
    typeof record.moving === 'boolean'
      ? record.moving
      : typeof record.motion === 'boolean'
        ? Boolean(record.motion)
        : typeof latestData.motion === 'boolean'
          ? Boolean(latestData.motion)
          : typeof latestData.moving === 'boolean'
            ? Boolean(latestData.moving)
            : speed > 0;

  const identifier = String(
    firstDefined(
      record.identifier,
      record.device_identifier,
      record.imei,
      record.deviceId,
      record.id,
      index,
    ),
  );

  const name = String(
    firstDefined(
      record.name,
      record.device_name,
      record.device,
      record.label,
      record.plate,
      identifier,
    ),
  );

  const lastFuelDownloadValue = firstDefined(
    record.lastFuelDownload,
    record.last_fuel_download,
    record.last_liters,
    latestData.lastFuelDownload,
    latestData.last_fuel_download,
    latestData.last_liters,
    latestData.Litros,
    latestData.LitrosT,
  );

  return {
    id: String(record.id ?? identifier),
    identifier,
    name,
    latitude,
    longitude,
    speed,
    moving,
    lastReport:
      normalizeTextValue(
        firstDefined(
          record.last_report,
          record.lastReport,
          latestData.timestamp,
          latestData.fecha,
          latestData.datetime,
          latestData.created_at,
          latestData.updated_at,
          record.timestamp,
          record.device_time,
          record.fixTime,
        ),
      ) || undefined,
    ibuttonName:
      firstNonEmptyText(
        record.ibutton_name,
        record.nombre_ibutton,
        record.driver_name,
        record.iButtonName,
        latestData.ibutton_name,
        latestData.nombre_ibutton,
        latestData.driver_name,
        latestData.iButtonName,
      ) || undefined,
    address:
      firstNonEmptyText(
        record.direccion,
        record.Direccion,
        record['Dirección'],
        record.address,
        record.location_name,
        record.last_address,
        latestData.direccion,
        latestData.Direccion,
        latestData['Dirección'],
        latestData.address,
        latestData.location_name,
      ) || undefined,
    lastFuelDownload:
      lastFuelDownloadValue != null ? toNumber(lastFuelDownloadValue, 0) : null,
    raw: record,
  };
}

export async function getPositions(token: string): Promise<PositionItem[]> {
  const payload = await apiRequest<unknown>('/fleet/positions', { token });
  const rows = getArrayCandidate(payload, ['items', 'data', 'results', 'positions']);

  return rows
    .map((item, index) => normalizePositionItem(item, index))
    .filter((item): item is PositionItem => item !== null);
}

function normalizeDevice(item: unknown, index: number): DeviceOption | null {
  if (typeof item !== 'object' || item === null) return null;

  const record = item as Record<string, unknown>;
  const identifier = String(record.identifier ?? record.imei ?? record.device_identifier ?? record.id ?? index);

  return {
    id: String(record.id ?? identifier),
    identifier,
    name: String(record.name ?? record.device ?? record.label ?? record.plate ?? identifier),
  };
}

export async function getDevices(token: string): Promise<DeviceOption[]> {
  const payload = await apiRequest<unknown>('/devices', { token });
  const rows = getArrayCandidate(payload, ['items', 'data', 'results', 'devices']);

  return rows
    .map((item, index) => normalizeDevice(item, index))
    .filter((item): item is DeviceOption => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function pickArrayValue(
  record: Record<string, unknown>,
  index: number,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value) && index < value.length) {
      return value[index];
    }
  }

  return undefined;
}

function normalizeTimestampValue(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return raw;
}

function fuelEventTimeMs(timestamp: string): number {
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

function roundCoordForReverse(value: number): string {
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

function extractReverseGeocodeAddress(payload: unknown): string | undefined {
  const record = parsePossibleRecord(payload);
  const nested = pickNestedRecord(record.result, record.data, record.payload);

  return firstNonEmptyText(
    record.address,
    record.direccion,
    record.display_name,
    record.displayName,
    record.formatted_address,
    record.formattedAddress,
    record.name,
    nested.address,
    nested.direccion,
    nested.display_name,
    nested.displayName,
    nested.formatted_address,
    nested.formattedAddress,
    nested.name,
  );
}

const reverseGeocodeCache = new Map<string, Promise<string | undefined>>();

async function reverseGeocodeAddress(
  token: string,
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  const lat = roundCoordForReverse(latitude);
  const lng = roundCoordForReverse(longitude);
  const cacheKey = `${lat},${lng}`;

  if (!reverseGeocodeCache.has(cacheKey)) {
    reverseGeocodeCache.set(
      cacheKey,
      (async () => {
        try {
          const payload = await apiRequest<unknown>(
            `/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
            { token },
          );

          return extractReverseGeocodeAddress(payload);
        } catch {
          return undefined;
        }
      })(),
    );
  }

  return reverseGeocodeCache.get(cacheKey)!;
}

async function enrichFuelEventsWithReverseGeocode(
  token: string,
  events: FuelEvent[],
): Promise<FuelEvent[]> {
  return Promise.all(
    events.map(async (event) => {
      if (normalizeTextValue(event.address)) {
        return event;
      }

      if (event.latitude == null || event.longitude == null) {
        return event;
      }

      const reverseAddress = await reverseGeocodeAddress(
        token,
        event.latitude,
        event.longitude,
      );

      if (!reverseAddress) {
        return event;
      }

      return {
        ...event,
        address: reverseAddress,
      };
    }),
  );
}

function buildFuelRow(
  item: unknown,
  index: number,
  root?: Record<string, unknown>,
  forcedTimestamp?: unknown,
): Record<string, unknown> {
  const base =
    typeof item === 'object' && item !== null && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : {};

  const baseMeta = resolveFuelMetaRecord(base);
  const baseCoords = pickNestedRecord(base.gps, base.coords, base.location, base.position);
  const metaCoords = pickNestedRecord(
    baseMeta.gps,
    baseMeta.coords,
    baseMeta.location,
    baseMeta.position,
  );

  const latitude = firstFiniteNumber(
    base.lat,
    base.latitude,
    base.gps_lat,
    base.gpsLat,
    baseCoords.lat,
    baseCoords.latitude,
    baseCoords.gps_lat,
    baseCoords.gpsLat,
    baseMeta.lat,
    baseMeta.latitude,
    baseMeta.gps_lat,
    baseMeta.gpsLat,
    metaCoords.lat,
    metaCoords.latitude,
    metaCoords.gps_lat,
    metaCoords.gpsLat,
    root ? pickArrayValue(root, index, ['latitudes', 'lat', 'latitude', 'gps_lat', 'gpsLat']) : undefined,
  );

  const longitude = firstFiniteNumber(
    base.lng,
    base.lon,
    base.longitude,
    base.gps_lng,
    base.gpsLng,
    base.gps_lon,
    base.gpsLon,
    baseCoords.lng,
    baseCoords.lon,
    baseCoords.longitude,
    baseCoords.gps_lng,
    baseCoords.gpsLng,
    baseCoords.gps_lon,
    baseCoords.gpsLon,
    baseMeta.lng,
    baseMeta.lon,
    baseMeta.longitude,
    baseMeta.gps_lng,
    baseMeta.gpsLng,
    baseMeta.gps_lon,
    baseMeta.gpsLon,
    metaCoords.lng,
    metaCoords.lon,
    metaCoords.longitude,
    metaCoords.gps_lng,
    metaCoords.gpsLng,
    metaCoords.gps_lon,
    metaCoords.gpsLon,
    root
      ? pickArrayValue(root, index, [
          'longitudes',
          'lng',
          'lon',
          'longitude',
          'gps_lng',
          'gpsLng',
          'gps_lon',
          'gpsLon',
        ])
      : undefined,
  );

  return {
    ...base,

    timestamp:
      firstDefined(
        base.ts,
        base.timestamp,
        base.fecha,
        base.date,
        base.datetime,
        base.created_at,
        base.createdAt,
        base.eventTime,
        baseMeta.ciclo_fin,
        baseMeta.ciclo_inicio,
        forcedTimestamp,
        root ? pickArrayValue(root, index, ['timestamps', 'ts', 'fechas', 'dates']) : undefined,
      ) ?? forcedTimestamp,

    value:
      firstDefined(
        base.value,
        base.LitrosT,
        base.liters,
        base.litros,
        base.valor,
        base.volume,
        base.volumen,
        baseMeta.value,
        baseMeta.LitrosT,
        baseMeta.liters,
        baseMeta.litros,
        baseMeta.valor,
      ) ?? item,

    address:
      firstNonEmptyText(
        base.address,
        base.direccion,
        base.Direccion,
        base['Dirección'],
        base.location_name,
        base.location,
        base.addressName,
        base.formattedAddress,
        base.last_address,
        base.lastAddress,
        baseMeta.address,
        baseMeta.direccion,
        baseMeta.Direccion,
        baseMeta['Dirección'],
        baseMeta.location_name,
        baseMeta.location,
        baseMeta.addressName,
        baseMeta.formattedAddress,
        baseMeta.last_address,
        baseMeta.lastAddress,
        root
          ? pickArrayValue(root, index, [
              'addresses',
              'address',
              'direcciones',
              'direccion',
              'Direcciones',
              'Direccion',
              'Dirección',
              'location_names',
              'location_name',
              'formattedAddress',
              'formattedAddresses',
              'last_address',
              'lastAddress',
            ])
          : undefined,
      ) ||
      deepFindLikelyAddress(base) ||
      deepFindLikelyAddress(baseMeta) ||
      '',

    ibutton:
      firstDefined(
        base.ibutton,
        base.IButton,
        base.Ibutton_Reverse,
        base.ibutton_reverse,
        base.iButton,
        baseMeta.ibutton,
        baseMeta.IButton,
        baseMeta.Ibutton_Reverse,
        baseMeta.ibutton_reverse,
        baseMeta.iButton,
        root
          ? pickArrayValue(root, index, [
              'ibuttons',
              'ibutton',
              'IButton',
              'iButtons',
              'ibutton_reverse',
              'Ibutton_Reverse',
            ])
          : undefined,
      ) ?? '',

    ibuttonName:
      firstDefined(
        base.ibuttonName,
        base.ibutton_name,
        base.nombre_ibutton,
        base.driver_name,
        base.driverName,
        base.iButtonName,
        baseMeta.ibuttonName,
        baseMeta.ibutton_name,
        baseMeta.nombre_ibutton,
        baseMeta.driver_name,
        baseMeta.driverName,
        baseMeta.iButtonName,
        root
          ? pickArrayValue(root, index, [
              'ibutton_names',
              'ibutton_name',
              'nombre_ibutton',
              'driver_names',
              'driver_name',
              'iButtonName',
            ])
          : undefined,
      ) ?? '',

    lat: latitude,
    lng: longitude,
  };
}

function normalizeFuelRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload.map((item, index) => buildFuelRow(item, index));
  }

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.timestamps) && Array.isArray(record.values)) {
      return (record.values as unknown[]).map((valueAtIndex, index) =>
        buildFuelRow(
          valueAtIndex,
          index,
          record,
          (record.timestamps as unknown[])[index],
        ),
      );
    }

    const direct = getArrayCandidate(payload, ['items', 'data', 'results', 'history', 'events', 'values']);

    if (direct.length > 0) {
      return direct.map((item, index) => buildFuelRow(item, index, record));
    }
  }

  return [];
}

function normalizeFuelEvent(item: unknown, index: number): FuelEvent | null {
  if (typeof item !== 'object' || item === null) return null;

  const record = item as Record<string, unknown>;
  const raw = resolveFuelMetaRecord(record);
  const recordCoords = pickNestedRecord(record.gps, record.coords, record.location, record.position);
  const rawCoords = pickNestedRecord(raw.gps, raw.coords, raw.location, raw.position);

  const liters = toNumber(
    firstDefined(
      record.LitrosT,
      record.value,
      record.liters,
      record.litros,
      record.valor,
      record.volume,
      record.volumen,
      raw.LitrosT,
      raw.value,
      raw.liters,
      raw.litros,
      raw.valor,
    ),
    NaN,
  );

  if (!Number.isFinite(liters)) return null;

  const rawTimestamp = firstDefined(
    record.ts,
    record.timestamp,
    record.fecha,
    record.date,
    record.datetime,
    record.created_at,
    record.createdAt,
    record.eventTime,
    raw.ts,
    raw.timestamp,
    raw.ciclo_fin,
    raw.ciclo_inicio,
    raw.fecha,
    raw.date,
    raw.datetime,
    raw.created_at,
    raw.createdAt,
  );

  const fecha = firstDefined(raw.Fecha, raw.fecha);
  const hora = firstDefined(raw.Hora, raw.hora);

  const fallbackDateTime =
    fecha && hora
      ? `${fecha}T${hora}`
      : fecha
        ? String(fecha)
        : '';

  const normalizedTimestamp =
    normalizeTimestampValue(rawTimestamp) ||
    normalizeTimestampValue(fallbackDateTime) ||
    '';

  const normalizedAddress =
    firstNonEmptyText(
      record.address,
      record.direccion,
      record.Direccion,
      record['Dirección'],
      record.location_name,
      record.location,
      record.addressName,
      record.formattedAddress,
      record.last_address,
      record.lastAddress,
      raw.address,
      raw.direccion,
      raw.Direccion,
      raw['Dirección'],
      raw.location_name,
      raw.location,
      raw.addressName,
      raw.formattedAddress,
      raw.last_address,
      raw.lastAddress,
    ) ||
    deepFindLikelyAddress(record) ||
    deepFindLikelyAddress(raw);

  const latitude = firstFiniteNumber(
    record.lat,
    record.latitude,
    record.gps_lat,
    record.gpsLat,
    recordCoords.lat,
    recordCoords.latitude,
    recordCoords.gps_lat,
    recordCoords.gpsLat,
    raw.lat,
    raw.latitude,
    raw.gps_lat,
    raw.gpsLat,
    rawCoords.lat,
    rawCoords.latitude,
    rawCoords.gps_lat,
    rawCoords.gpsLat,
  );

  const longitude = firstFiniteNumber(
    record.lng,
    record.lon,
    record.longitude,
    record.gps_lng,
    record.gpsLng,
    record.gps_lon,
    record.gpsLon,
    recordCoords.lng,
    recordCoords.lon,
    recordCoords.longitude,
    recordCoords.gps_lng,
    recordCoords.gpsLng,
    recordCoords.gps_lon,
    recordCoords.gpsLon,
    raw.lng,
    raw.lon,
    raw.longitude,
    raw.gps_lng,
    raw.gpsLng,
    raw.gps_lon,
    raw.gpsLon,
    rawCoords.lng,
    rawCoords.lon,
    rawCoords.longitude,
    rawCoords.gps_lng,
    rawCoords.gpsLng,
    rawCoords.gps_lon,
    rawCoords.gpsLon,
  );

  return {
    id: String(
      record.id ??
        raw.id ??
        `${normalizedTimestamp || fallbackDateTime || 'sin-fecha'}-${index}`,
    ),
    timestamp: normalizedTimestamp,
    liters,
    address: normalizedAddress || undefined,
    ibutton:
      firstNonEmptyText(
        record.Ibutton_Reverse,
        record.IButton,
        record.ibutton,
        record.ibutton_reverse,
        record.iButton,
        record.driverKey,
        record.driver_id,
        raw.Ibutton_Reverse,
        raw.IButton,
        raw.ibutton,
        raw.ibutton_reverse,
        raw.iButton,
        raw.driverKey,
        raw.driver_id,
      ) || undefined,
    ibuttonName:
      firstNonEmptyText(
        record.nombre_ibutton,
        record.ibutton_name,
        record.driver_name,
        record.nombre,
        record.iButtonName,
        record.driverName,
        raw.nombre_ibutton,
        raw.ibutton_name,
        raw.driver_name,
        raw.nombre,
        raw.iButtonName,
        raw.driverName,
      ) || undefined,
    latitude,
    longitude,
    raw: record,
  };
}

function isMeaningfulFuelEvent(event: FuelEvent): boolean {
  return event.liters > 0;
}

type FuelQueryInput = {
  token: string;
  identifier: string;
  dateFrom: string;
  dateTo: string;
};

export async function getFuelHistory(input: FuelQueryInput): Promise<FuelEvent[]> {
  const query = new URLSearchParams({
    mode: 'history',
    key: 'LitrosT',
    per_page: '5000',
    date_from: input.dateFrom,
    date_to: input.dateTo,
  });

  const payload = await apiRequest<unknown>(
    `/variables/${encodeURIComponent(input.identifier)}?${query.toString()}`,
    {
      token: input.token,
    },
  );

  const rows = normalizeFuelRows(payload);

  const normalized = rows
    .map((item, index) => normalizeFuelEvent(item, index))
    .filter((item): item is FuelEvent => item !== null);

  const meaningful = normalized.filter(isMeaningfulFuelEvent);

  const enriched = await enrichFuelEventsWithReverseGeocode(input.token, meaningful);

  return enriched.sort((a, b) => fuelEventTimeMs(b.timestamp) - fuelEventTimeMs(a.timestamp));
}

export function buildFuelReport(events: FuelEvent[]): FuelReport {
  const totalLiters = events.reduce((sum, event) => sum + (event.liters || 0), 0);
  const totalEvents = events.length;
  const sorted = [...events].sort(
    (a, b) => fuelEventTimeMs(a.timestamp) - fuelEventTimeMs(b.timestamp),
  );

  return {
    totalLiters,
    totalEvents,
    firstEvent: sorted[0]?.timestamp,
    lastEvent: sorted[sorted.length - 1]?.timestamp,
  };
}