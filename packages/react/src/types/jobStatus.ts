import { JOB_STATUS_PAYMENT } from '../shared/constants';
import { JOB_STATUS_LIST } from '../shared/constants';
import { JOB_STATUS_DEPARTMENTS } from '../shared/constants';
import { JOB_STATUS } from '../shared/constants';

export type JobStatus = (typeof JOB_STATUS)[number];

export type JobStatusPayment = (typeof JOB_STATUS_PAYMENT)[number];

export type JobStatusList = (typeof JOB_STATUS_LIST)[number];

export type JobStatusDepartments = (typeof JOB_STATUS_DEPARTMENTS)[number];

export interface IJobStatus extends Document {
  _id: string;
  DepartmentName: string;
  StatusType: string;
  TotalProfit: number;
  OrderBy: string;
  JobNo: string;
  ReferenceNo: string;
  JobDate: Date;
  OperatingUserId: string;
  DepartmentId: number;
  UserName: string;
  CustomerName: string;
  PendingInvoices: number;
  PendingCosts: number;
  Tejrim: string;
  CanceledJob: boolean;
  ConsigneeName: string;
  PaymentDate?: Date;
  MemberOf: string;
  JobType: string;
  Atd?: Date;
  Etd?: Date;
  Ata?: Date;
  Eta?: Date;
  FullPaid?: boolean; // Optional field for full paid status
  PaidDO?: boolean;
  PaidDate?: Date;
  MissingDocuments?: boolean;
  MissingDocumentsDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
