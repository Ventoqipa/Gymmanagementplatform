/** Cuerpo POST /Add y PUT /Update (contrato catálogo Client). */
export type CatalogClientWritePayload = {
  clientID: number;
  companyID: number;
  branchID: number;
  rfc: string;
  curp: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  countryID: number;
  stateID: number;
  municipalityID: number;
  email: string;
  phoneCodeNumber: string;
  phoneNumber: string;
  phoneCodeNumberEmergency: string;
  phoneNumberEmergency: string;
  statusID: number;
  fullAddress: string;
  planID: number;
  DateEnrollment: string;
  DateRenewal: string;
  DateExpiration: string;
  DocFileName: string | null;
  DocExtensionName: string;
  DocBase64: string;
};

/** Respuesta GET / listado (acepta nombres legacy y actuales). */
export type CatalogClient = Partial<CatalogClientWritePayload> & {
  isEnabled?: boolean;
  isNew?: boolean;
  userAdded?: string | null;
  dateAdded?: string | null;
  userEdited?: string | null;
  dateEdited?: string | null;
  clientID: number;
  companyID?: number;
  branchID?: number;
  planID?: number;
  /** Legacy */
  enrollment?: string;
  renewal?: string | null;
  memberID?: string | null;
  faceID?: string | null;
  DateExpiration?: string;
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

/** Ítem resumido de GET Client/ListAll (fallback). */
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
