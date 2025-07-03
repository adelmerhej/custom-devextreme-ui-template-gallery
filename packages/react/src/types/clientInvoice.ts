import { Activities } from './card-activities';
import { Task } from './task';
import { Opportunities } from './card-opportunities';
import { CONTACT_STATUS_LIST } from '../shared/constants';

export type ContactStatus = (typeof CONTACT_STATUS_LIST)[number];

interface State {
    stateShort: string;
}

export interface IClientInvoice extends Document {
  _id: string;
  JobNo: string;
  JobDate?: Date;
  CustomerName?: string;
  ConsigneeName?: string;
  DepartmentName?: string;
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
  DepartmentId: string;
  MemberOf: string;
  JobType: string;
  // Relationships
  status: ContactStatus,
  state: State,
  opportunities: Opportunities,
  activities: Activities[];
  tasks: Task[];
  image: string;
  firstName: string;
  lastName: string;
  // END Relationships
  createdAt: Date;
  updatedAt: Date;
}
