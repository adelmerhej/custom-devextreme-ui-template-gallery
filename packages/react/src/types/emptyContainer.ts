import { JOB_STATUS, JOB_STATUS_LIST, JOB_STATUS_DEPARTMENTS, JOB_STATUS_PAYMENT } from '../shared/constants';

export type JobStatus = (typeof JOB_STATUS)[number];

export type JobStatusPayment = (typeof JOB_STATUS_PAYMENT)[number];

export type StatusList = (typeof JOB_STATUS_LIST)[number];

export type JobStatusDepartments = (typeof JOB_STATUS_DEPARTMENTS)[number];

export interface IEmptyContainer extends Document {
  _id: string;
  JobNo: string;
  JobDate?: Date;
  CustomerName?: string;
  ConsigneeName?: string;
  DepartmentName?: string;
  StatusType?: string;
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
  sumOfTotalProfit?: number;
  DepartmentId: string;
  MemberOf: string;
  JobType: string;
  createdAt: Date;
  updatedAt: Date;
}
