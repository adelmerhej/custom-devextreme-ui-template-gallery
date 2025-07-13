import { JOB_STATUS, JOB_STATUS_LIST, JOB_STATUS_DEPARTMENTS, JOB_STATUS_PAYMENT } from '../shared/constants';

export type JobStatus = (typeof JOB_STATUS)[number];

export type JobStatusPayment = (typeof JOB_STATUS_PAYMENT)[number];

export type StatusList = (typeof JOB_STATUS_LIST)[number];

export type JobStatusDepartments = (typeof JOB_STATUS_DEPARTMENTS)[number];

export interface IOngoingJob extends Document {
  _id: string;
  JobNo: number;
  DepartmentId: number;
  DepartmentName: string;
  JobDate?: Date;
  CustomerName?: string;
  ConsigneeName?: string;
  StatusType?: string;
  TotalProfit?: number;
  Eta?: Date;
  Ata?: Date;
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
  MemberOf: string;
  JobType: string;
  createdAt: Date;
  updatedAt: Date;
}
