import { Activities } from './card-activities';
import { Task } from './task';
import { Opportunities } from './card-opportunities';
import { JOB_STATUS } from '../shared/constants';

export type ContactStatus = (typeof JOB_STATUS)[number];

interface State {
    stateShort: string;
}

export interface ITotalProfit {
    id: number,
    name: string,
    status: ContactStatus,
    city: string,
    state: State,
    zipCode: number,
    activities: Activities,
    opportunities: Opportunities,
    tasks: Task[],
    address: string,
    firstName: string,
    lastName: string,
    position: string,
    manager: string,
    company: string,
    phone: string,
    email: string,
    image: string,
}
