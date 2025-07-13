import { JOB_STATUS, JOB_STATUS_LIST, JOB_STATUS_DEPARTMENTS, JOB_STATUS_PAYMENT, INVOICE_PAYMENT } from '../shared/constants';

export type JobStatus = (typeof JOB_STATUS)[number];

export type JobStatusPayment = (typeof JOB_STATUS_PAYMENT)[number];
export type InvoicePayment = (typeof INVOICE_PAYMENT)[number];

export type StatusList = (typeof JOB_STATUS_LIST)[number];

export type JobStatusDepartments = (typeof JOB_STATUS_DEPARTMENTS)[number];

export interface IClientInvoice extends Document {
  _id: string;
  JobNo: number;
  DepartmentId: number;
  DepartmentName: string;
  JobDate?: Date;
  Customer?: string;
  Consignee?: string;
  StatusType?: string;
  Eta?: Date;
  Ata?: Date;
  Etd?: Date;
  Atd?: Date;
  POL?: string;
  POD?: string;
  InvoiceNo?: string;
  DueDate?: Date;
  TotalInvoiceAmount?: number;
  Arrival?: Date;
  UserName?: string;
  Notes?: string;
  CountryOfDeparture?: string;
  Departure?: string;
  Destination?: string;
  ReferenceNo?: string;
  vessel?: string;
  TotalInvoices?: number;
  TotalCosts?: number;
  TotalProfit?: number;
  MemberOf: string;
  JobType: string;
  createdAt: Date;
  updatedAt: Date;
}
