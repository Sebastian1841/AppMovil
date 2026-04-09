export type UserSession = {
  username: string;
  role?: string;
  token: string;
  refreshToken?: string | null;
};

export type PositionItem = {
  id: string;
  identifier: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  moving: boolean;
  lastReport?: string;
  ibuttonName?: string;
  address?: string;
  lastFuelDownload?: number | null;
  raw?: Record<string, unknown>;
};

export type DeviceOption = {
  id: string;
  identifier: string;
  name: string;
};

export type FuelEvent = {
  id: string;
  timestamp: string;
  liters: number;
  address?: string;
  ibutton?: string;
  ibuttonName?: string;
  latitude?: number | null;
  longitude?: number | null;
  raw?: Record<string, unknown>;
};

export type FuelReport = {
  totalLiters: number;
  totalEvents: number;
  firstEvent?: string;
  lastEvent?: string;
};
