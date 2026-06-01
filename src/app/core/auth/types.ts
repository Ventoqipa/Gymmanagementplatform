/** Cuerpo enviado a POST /api/ge/Security/Access/SignIn */
export type SignInRequestBody = {
  hermesID: string;
  userPass: string;
  ipAddress: string;
  typeAccess: string;
  appID: number;
};

export type CompanyBranch = {
  companyID: number;
  branchID: number;
  branchName: string;
  countryID: number;
  countryName: string;
  stateID: number;
  stateName: string;
  municipalityID: number;
  municipalityName: string;
  isEnabled: boolean;
};

export type CompanyProfile = {
  companyProfileID: number;
  companyID: number;
  profileID: number;
  profileName: string;
};

export type ProfileUser = {
  profileEmployeeID: number;
  companyProfileID: number;
  profileID: number;
  profileName: string;
  isDefaultProfile: boolean;
  hermesID: string;
  isEnabled: boolean;
  isNew: boolean;
  userAdded: string | null;
  dateAdded: string | null;
  userEdited: string | null;
  dateEdited: string | null;
};

export type AuthenticatedUser = {
  hermesID: string;
  userFullName: string;
  email: string;
  companyID: number;
  companyName: string;
  regimenCapitalID: number;
  regimenCapitalName: string;
  isPersonaFisica: boolean;
  namePersonResponsible: string;
  logo: string;
  extensionName: string;
  branchID: number;
  branchName: string;
  statusID: number;
  statusName: string;
  isEnabled: boolean;
  companyBranches: CompanyBranch[];
  companyProfiles: CompanyProfile[];
  profilesUser: ProfileUser[];
};

export type SignInSuccessData = {
  token: string;
  duration: string;
  authenticatedUser: AuthenticatedUser;
};

/** Respuesta estándar del API Tanosi */
export type TanosiApiResponse<T> = {
  statusCode: number;
  messageTechnical: string;
  messageUser: string;
  errorNumber: number;
  data: T;
  isResponseSuccessful: boolean;
  status: number;
  message: string | null;
};

/** Respuesta de validación ASP.NET (400) */
export type AspNetValidationError = {
  type?: string;
  title?: string;
  status?: number;
  errors?: Record<string, string[]>;
  traceId?: string;
};

export type SignInSession = SignInSuccessData;
