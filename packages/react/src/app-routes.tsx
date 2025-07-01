import {
  PlanningScheduler,
  PlanningTaskList,
  PlanningTaskDetails,
  AnalyticsDashboard,
  AnalyticsSalesReport,
  AnalyticsGeography,
  SignInPage,
  SignUpPage,
  ResetPasswordPage,
  UserProfile,
  JobStatusReport,
  TotalProfitReport,
  EmptyContainersReport,
  ClientInvoicesReport,
  OnGoingJobsReport
} from './pages';
import { withNavigationWatcher } from './contexts/navigation';

const routes = [
  {
    path: '/total-profit',
    element: TotalProfitReport,
  },
  {
    path: '/job-status',
    element: JobStatusReport,
  },
  {
    path: '/empty-containers',
    element: EmptyContainersReport,
  },
  {
    path: '/client-invoices',
    element: ClientInvoicesReport,
  },
  {
    path: '/ongoing-jobs',
    element: OnGoingJobsReport,
  },
  {
    path: '/planning-task-list',
    element: PlanningTaskList,
  },
  {
    path: '/planning-task-details',
    element: PlanningTaskDetails,
  },
  {
    path: '/planning-scheduler',
    element: PlanningScheduler,
  },
  {
    path: '/analytics-dashboard',
    element: AnalyticsDashboard,
  },
  {
    path: '/analytics-sales-report',
    element: AnalyticsSalesReport,
  },
  {
    path: '/analytics-geography',
    element: AnalyticsGeography,
  },
  {
    path: '/sign-in-form',
    element: SignInPage,
  },
  {
    path: '/sign-up-form',
    element: SignUpPage,
  },
  {
    path: '/reset-password-form',
    element: ResetPasswordPage,
  },
  {
    path: '/user-profile',
    element: UserProfile,
  },
];

export const appRoutes = routes.map((route) => {
  return {
    ...route,
    element: withNavigationWatcher(route.element, route.path),
  };
});
