import mongoose, { Document, Schema, Model } from 'mongoose';

interface ITotalProfit extends Document {
  JobNo: string;
  JobDate?: Date;
  CustomerName?: string;
  ConsigneeName?: string;
  DepartmentName?: string;
  StatusType?: string;
  TotalProfit?: number;
  Eta?: Date;
  Ata?: Date;
  UserName?: string;
  Notes?: string;
  CountryOfDeparture?: string;
  Departure?: string;
  Destination?: string;
  ReferenceNo?: string;
  vessel?: string;
  TotalInvoices?: number;
  TotalCosts?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TotalProfitSchema: Schema<ITotalProfit> = new Schema(
  {
    JobNo: {
      type: String,
      required: [true, 'JobNo is required'],
      unique: true,
      maxlength: [50, 'JobNo cannot exceed 50 characters'],
    },
    JobDate: {
      type: Date,
    },
    CustomerName: {
      type: String,
      default: '',
      maxlength: [100, 'CustomerName cannot exceed 100 characters'],
    },
    ConsigneeName: {
      type: String,
      default: '',
      maxlength: [100, 'ConsigneeName cannot exceed 100 characters'],
    },
    DepartmentName: {
      type: String,
      default: '',
      maxlength: [50, 'DepartmentName cannot exceed 50 characters'],
    },
    StatusType: {
      type: String,
      default: '',
    },
    TotalProfit: {
      type: Number,
      default: 0,
      min: [0, 'TotalProfit cannot be negative'],
    },
    Eta: {
      type: Date,
    },
    Ata: {
      type: Date,
    },
    UserName: {
      type: String,
      default: '',
      maxlength: [50, 'UserName cannot exceed 50 characters'],
    },
    Notes: {
      type: String,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    CountryOfDeparture: {
      type: String,
      default: '',
      maxlength: [50, 'CountryOfDeparture cannot exceed 50 characters'],
    },
    Departure: {
      type: String,
      default: '',
      maxlength: [50, 'Departure cannot exceed 50 characters'],
    },
    Destination: {
      type: String,
      default: '',
      maxlength: [50, 'Destination cannot exceed 50 characters'],
    },
    ReferenceNo: {
      type: String,
      default: '',
      maxlength: [50, 'ReferenceNo cannot exceed 50 characters'],
    },
    vessel: {
      type: String,
      default: '',
      maxlength: [50, 'Vessel cannot exceed 50 characters'],
    },
    TotalInvoices: {
      type: Number,
      default: 0,
      min: [0, 'TotalInvoices cannot be negative'],
    },
    TotalCosts: {
      type: Number,
      default: 0,
      min: [0, 'TotalCosts cannot be negative'],
    },
  },
  { timestamps: true, collection: 'totalprofits' }
);

// Add indexes for better performance
TotalProfitSchema.index({ CustomerName: 1 });
TotalProfitSchema.index({ StatusType: 1 });
TotalProfitSchema.index({ JobDate: 1 });
TotalProfitSchema.index({ TotalProfit: 1 });
TotalProfitSchema.index({ StatusType: 1, JobDate: -1 });

// Virtual property to check if job is delayed
TotalProfitSchema.virtual('isDelayed').get(function() {
  if (!this.Eta) return false;
  return this.StatusType !== 'Completed' && new Date() > this.Eta;
});

// Virtual property to calculate profit margin
TotalProfitSchema.virtual('totalProfitMargin').get(function() {
  return (this.TotalInvoices || 0) - (this.TotalCosts || 0);
});

export const TotalProfitModel: Model<ITotalProfit> =
  mongoose.models.TotalProfit ||
  mongoose.model<ITotalProfit>('TotalProfit', TotalProfitSchema);
