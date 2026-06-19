import { resolveApiBaseUrl } from "./apiBaseUrl";

const catalogApiBaseUrl = resolveApiBaseUrl({
  envUrl: import.meta.env.VITE_CATALOG_API_URL,
  devProxyPath: "/catalog-api",
  productionDefault: "/catalog-api",
});

export const catalogConfig = {
  apiBaseUrl: catalogApiBaseUrl,
  paths: {
    listAll: (companyId: number, branchId: number) =>
      `/api/eg/Catalogs/Client/ListAll/${companyId}/${branchId}`,
    getData: (clientId: number) =>
      `/api/eg/Catalogs/Client/GetData/${clientId}`,
    add: "/api/eg/Catalogs/Client/Add",
    update: "/api/eg/Catalogs/Client/Update",
    delete: (clientId: number) =>
      `/api/eg/Catalogs/Client/Delete/${clientId}`,
  },
  defaults: {
    countryId: Number(import.meta.env.VITE_CATALOG_DEFAULT_COUNTRY_ID ?? "1") || 1,
    stateId: Number(import.meta.env.VITE_CATALOG_DEFAULT_STATE_ID ?? "1") || 1,
    municipalityId:
      Number(import.meta.env.VITE_CATALOG_DEFAULT_MUNICIPALITY_ID ?? "1") || 1,
    statusId: Number(import.meta.env.VITE_CATALOG_DEFAULT_STATUS_ID ?? "1") || 1,
    photoPlaceholder:
      (import.meta.env.VITE_CATALOG_PHOTO_PLACEHOLDER ?? "sin-identificacion.jpg").trim(),
  },
} as const;

export function catalogUrl(path: string): string {
  return `${catalogConfig.apiBaseUrl}${path}`;
}
