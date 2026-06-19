/** Cliente del catálogo Tanosi — [Swagger Client](https://apicatalogsegtest.tanosi.com.mx/swagger/index.html) */

export type CatalogClient = {
  isEnabled: boolean;
  isNew: boolean;
  userAdded: string;
  dateAdded: string;
  userEdited: string;
  dateEdited: string;
  clientID: number;
  companyID: number;
  branchID: number;
  isPersonaFisica: boolean;
  rfc: string;
  nombreDenominacionRazonSocial: string;
  fullName: string;
  firstName: string;
  lastName: string;
  regimenCapitalID: number;
  email: string;
  isEmailFavorite: boolean;
  phoneNumber: string;
  isPhoneFavorite: boolean;
  countryID: number;
  stateID: number;
  municipalityID: number;
  street: string;
  colony: string;
  zip: string;
  fullAddress: string;
  statusID: number;
  enrollment: string;
  renewal: string;
  photoClientIdentificationFileName: string;
};

export type CatalogApiResponse<T = unknown> = {
  isResponseSuccessful: boolean;
  status: number;
  message: string | null;
  statusCode: number;
  messageTechnical: string | null;
  messageUser: string | null;
  errorNumber: number;
  data: T;
};

export type AddClientInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  street?: string;
  colony?: string;
  zip?: string;
  fullAddress?: string;
  enrollmentDate: string;
  renewalDate: string;
  photoFileName?: string;
};

export type UpdateClientInput = AddClientInput & {
  clientID: number;
};
