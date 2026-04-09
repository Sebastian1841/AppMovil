import Constants from 'expo-constants';

import { DeviceOption, FuelEvent, FuelReport, PositionItem, UserSession } from '@/types';
import { toNumber } from '@/utils/format';

const extra = Constants.expoConfig?.extra ?? {};
const envBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (typeof extra === 'object' && extra && 'apiBaseUrl' in extra ? String((extra as Record<string, unknown>).apiBaseUrl) : '');

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
  const data = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>;
  const token =
    String(data.access_token || data.token || data.jwt || data.auth_token || '').trim();

  if (!token) {
    throw new Error('La respuesta de login no incluye token.');
  }

  const user = (typeof data.user === 'object' && data.user !== null ? data.user : {}) as Record<string, unknown>;

  return {
    username: String(user.username || data.username || data.user_name || fallbackUsername),
    role: String(user.role || data.role || 'Operador'),
    token,
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
  };
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
    if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }

  return {};
}

function firstDefined<T = unknown>(...values: unknown[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value as T;
    }
  }

  return undefined;
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
    firstDefined(record.speed, record.velocity, nestedPosition.speed, latestData.speed, latestData.velocidad),
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
    firstDefined(record.identifier, record.device_identifier, record.imei, record.deviceId, record.id, index),
  );

  const name = String(
    firstDefined(record.name, record.device_name, record.device, record.label, record.plate, identifier),
  );

  const lastFuelDownloadValue = firstDefined(
    record.lastFuelDownload,
    record.last_fuel_download,
    latestData.lastFuelDownload,
    latestData.last_fuel_download,
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
    lastReport: String(
      firstDefined(
        latestData.timestamp,
        latestData.fecha,
        latestData.datetime,
        latestData.created_at,
        latestData.updated_at,
        record.last_report,
        record.lastReport,
        record.timestamp,
        record.device_time,
        record.fixTime,
      ) ?? '',
    ) || undefined,
    ibuttonName: String(
      firstDefined(
        latestData.nombre_ibutton,
        latestData.ibutton_name,
        latestData.driver_name,
        latestData.iButtonName,
        record.ibutton_name,
        record.nombre_ibutton,
        record.driver_name,
        record.iButtonName,
      ) ?? '',
    ) || undefined,
    address: String(
      firstDefined(
        latestData.direccion,
        latestData.address,
        latestData.location_name,
        record.address,
        record.last_address,
        record.location_name,
      ) ?? '',
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

function normalizeFuelRows(payload: unknown): unknown[] {
  const direct = getArrayCandidate(payload, ['items', 'data', 'results', 'history', 'values', 'events']);
  if (direct.length > 0) return direct;

  if (typeof payload !== 'object' || payload === null) return [];

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.timestamps) && Array.isArray(record.values)) {
    return (record.timestamps as unknown[]).map((timestamp, index) => ({
      timestamp,
      value: (record.values as unknown[])[index],
    }));
  }

  return [];
}

function normalizeFuelEvent(item: unknown, index: number): FuelEvent | null {
  if (typeof item !== 'object' || item === null) return null;

  const record = item as Record<string, unknown>;
  const liters = toNumber(record.LitrosT ?? record.value ?? record.liters ?? record.valor, NaN);

  if (!Number.isFinite(liters)) return null;

  const timestamp =
    String(record.timestamp ?? record.fecha ?? record.date ?? record.datetime ?? record.created_at ?? '').trim() ||
    new Date().toISOString();

  return {
    id: String(record.id ?? `${timestamp}-${index}`),
    timestamp,
    liters,
    address: String(record.address ?? record.direccion ?? record.location_name ?? '') || undefined,
    ibutton: String(record.Ibutton_Reverse ?? record.IButton ?? record.ibutton ?? record.ibutton_reverse ?? '') || undefined,
    ibuttonName: String(
      record.nombre_ibutton ?? record.ibutton_name ?? record.driver_name ?? record.nombre ?? '',
    ) || undefined,
    latitude:
      record.lat != null || record.latitude != null ? toNumber(record.lat ?? record.latitude, 0) : null,
    longitude:
      record.lng != null || record.lon != null || record.longitude != null
        ? toNumber(record.lng ?? record.lon ?? record.longitude, 0)
        : null,
    raw: record,
  };
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
    date_from: input.dateFrom,
    date_to: input.dateTo,
  });

  const payload = await apiRequest<unknown>(`/variables/${encodeURIComponent(input.identifier)}?${query.toString()}`, {
    token: input.token,
  });

  const rows = normalizeFuelRows(payload);

  return rows
    .map((item, index) => normalizeFuelEvent(item, index))
    .filter((item): item is FuelEvent => item !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function buildFuelReport(events: FuelEvent[]): FuelReport {
  const totalLiters = events.reduce((sum, event) => sum + event.liters, 0);
  const totalEvents = events.length;
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    totalLiters,
    totalEvents,
    firstEvent: sorted[0]?.timestamp,
    lastEvent: sorted[sorted.length - 1]?.timestamp,
  };
}
