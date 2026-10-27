import { market } from './market';

export const CURRENCY = market.currency;
export const TAX_NAME = market.taxName;
export const VAT_RATE = market.taxRate;
export const BOOKING_FEE = market.bookingFee;

export const CAR_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Pickup', 'Luxury'];
export const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
export const CAR_MAKES = {
  Toyota: ['Land Cruiser', 'Camry', 'Corolla', 'Prado', 'Hilux'],
  Nissan: ['Patrol', 'Kicks', 'Sunny', 'X-Trail'],
  Lexus: ['LX 570', 'ES 350', 'RX 350'],
  Hyundai: ['Tucson', 'Sonata', 'Creta', 'Palisade'],
  Kia: ['Sportage', 'Seltos', 'Telluride'],
  Ford: ['Explorer', 'Mustang', 'Territory'],
  Chevrolet: ['Tahoe', 'Camaro'],
  Honda: ['Accord', 'CR-V', 'City'],
  BMW: ['3 Series', 'X5', '5 Series'],
  'Mercedes-Benz': ['C-Class', 'GLE', 'E-Class'],
  'Land Rover': ['Range Rover', 'Defender'],
  Tesla: ['Model 3', 'Model Y'],
};
export const INSPECTION_REASONS = ['Pre-purchase check', 'Routine check-up', 'Post-accident check', 'Pre-trip check', 'Other'];
export const YEARS = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i);

export const TIME_SLOTS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00'];

export const CITIES = market.regions;
export const COUNTRY = market.country;
export const REGION_LABEL = market.regionLabel;
export const ALL_REGIONS = `All ${market.regionPlural}`;
export const SERVICE_AREA = market.serviceArea;

export const STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  assigned: { label: 'Assigned', tone: 'blue' },
  ongoing: { label: 'Ongoing', tone: 'violet' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export const COVER = 'Cover';
export const PHOTO_CATEGORIES = ['Cover', 'Exterior', 'Interior', 'Engine Bay & Undercarriage', 'Diagnostics', 'Other'];
export const COMPANY = market.company;

export const ADDRESS_LABELS = ['Home', 'Work', 'Other'];
export const PORTALS = {
  customer: { label: 'Customer', home: '/app' },
  inspector: { label: 'Inspector', home: '/inspector' },
  admin: { label: 'Admin', home: '/admin' },
};
