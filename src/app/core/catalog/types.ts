export type CatalogClient = {
  isEnabled: boolean;
  isNew: boolean;
  userAdded: string | null;
  dateAdded: string | null;
  userEdited: string | null;
  dateEdited: string | null;
  clientID: number;
  companyID: number;
  branchID: number;
  rfc: string | null;
  curp: string | null;
  fullName: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  countryID: number;
  stateID: number;
  municipalityID: number;
  email: string | null;
  phoneNumber: string | null;
  phoneCodeNumber: string | null;
  photoClientIDFileName: string | null;
  photoClientIDBase64: string | null;
  statusID: number;
  fullAddress: string | null;
  planID: number;
  enrollment: string;
  renewal: string | null;
};

export type CatalogPlan = {
  isEnabled: boolean;
  isNew: boolean;
  userAdded: string | null;
  dateAdded: string | null;
  userEdited: string | null;
  dateEdited: string | null;
  planID: number;
  planName: string;
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
  phoneCodeNumber: string;
  emergencyPhoneNumber?: string;
  emergencyPhoneCodeNumber?: string;
  fullAddress?: string;
  planID: number;
  enrollmentDate: string;
  renewalDate: string;
  idDocumentDataUrl?: string | null;
};

export type UpdateClientInput = AddClientInput & {
  clientID: number;
};

export type AddPlanInput = {
  planName: string;
  validityMonths: number;
};

export type UpdatePlanInput = AddPlanInput & {
  planID: number;
};

/** Ítem resumido de GET Client/ListAll */
export type CatalogClientListItem = {
  ClientID?: number;
  clientID?: number;
  FullName?: string;
  fullName?: string;
  IsEnabled?: boolean;
  isEnabled?: boolean;
};

export type CatalogClientListData = {
  genericList?: CatalogClientListItem[];
};

export type CatalogPlanListItem = {
  PlanID?: number;
  planID?: number;
  PlanName?: string;
  planName?: string;
  IsEnabled?: boolean;
  isEnabled?: boolean;
};

export type CatalogPlanListData = {
  plan?: CatalogPlanListItem[];
  Plan?: CatalogPlanListItem[];
  genericList?: CatalogPlanListItem[];
};

/** Plan con vigencia (meses) — metadata local complementaria al API */
export type PlanWithValidity = CatalogPlan & {
  validityMonths: number;
};
