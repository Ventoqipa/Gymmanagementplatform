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
    planListAll: "/api/eg/Catalogs/Plan/ListAll",
    planGetData: (planId: number) => `/api/eg/Catalogs/Plan/GetData/${planId}`,
    planAdd: "/api/eg/Catalogs/Plan/Add",
    planUpdate: "/api/eg/Catalogs/Plan/Update",
    planDelete: (planId: number) => `/api/eg/Catalogs/Plan/Delete/${planId}`,
  },
  defaults: {
    countryId: Number(import.meta.env.VITE_CATALOG_DEFAULT_COUNTRY_ID ?? "117") || 117,
    stateId: Number(import.meta.env.VITE_CATALOG_DEFAULT_STATE_ID ?? "25") || 25,
    municipalityId:
      Number(import.meta.env.VITE_CATALOG_DEFAULT_MUNICIPALITY_ID ?? "23") || 23,
    statusId: Number(import.meta.env.VITE_CATALOG_DEFAULT_STATUS_ID ?? "1") || 1,
    photoPlaceholder:
      (import.meta.env.VITE_CATALOG_PHOTO_PLACEHOLDER ?? "sin-identificacion.jpg").trim(),
  },
} as const;

export function catalogUrl(path: string): string {
  return `${catalogConfig.apiBaseUrl}${path}`;
}
