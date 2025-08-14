import { z } from 'zod';

// Base Clover schemas matching the exact API structure
export const CloverMerchantSchema = z.object({
  id: z.string(),
});

export const CloverAddressSchema = z.object({
  address1: z.string().optional(),
  address2: z.string().optional(),
  address3: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export const CloverEmailAddressSchema = z.object({
  id: z.string(),
  emailAddress: z.string(),
  verifiedTime: z.number().optional(),
  primaryEmail: z.boolean().optional().default(false),
  customer: z.object({
    id: z.string(),
  }).optional(),
});

export const CloverPhoneNumberSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  customer: z.object({
    id: z.string(),
  }).optional(),
});

export const CloverCardSchema = z.object({
  id: z.string(),
  first6: z.string().optional(),
  last4: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  expirationDate: z.string().optional(), // MMYY format
  additionalInfo: z.record(z.string()).optional(),
  cardType: z.string().optional(),
  token: z.string().optional(),
  tokenType: z.string().optional(),
  modifiedTime: z.number().optional(),
  customer: z.object({
    id: z.string(),
  }).optional(),
});

export const CloverOrderSchema = z.object({
  id: z.string(),
});

export const CloverMetadataSchema = z.object({
  businessName: z.string().optional(),
  note: z.string().optional(),
  dobYear: z.number().optional(),
  dobMonth: z.number().optional(),
  dobDay: z.number().optional(),
  modifiedTime: z.number().optional(),
  customer: z.object({
    id: z.string(),
  }).optional(),
});

// Helper schemas for nested array structures
const CloverArrayWrapperSchema = <T extends z.ZodType>(itemSchema: T) => z.union([
  z.array(itemSchema),
  z.object({
    elements: z.array(itemSchema)
  }).transform(data => data.elements)
]);

export const CloverCustomerSchema = z.object({
  id: z.string(),
  merchant: CloverMerchantSchema.optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  marketingAllowed: z.boolean().optional().default(false),
  customerSince: z.number().optional(),
  orders: CloverArrayWrapperSchema(CloverOrderSchema).optional().default([]),
  addresses: CloverArrayWrapperSchema(CloverAddressSchema).optional().default([]),
  emailAddresses: CloverArrayWrapperSchema(CloverEmailAddressSchema).optional().default([]),
  phoneNumbers: CloverArrayWrapperSchema(CloverPhoneNumberSchema).optional().default([]),
  cards: CloverArrayWrapperSchema(CloverCardSchema).optional().default([]),
  metadata: CloverMetadataSchema.optional(),
});

// API Response schemas
export const CloverCustomersResponseSchema = z.object({
  elements: z.array(CloverCustomerSchema),
  href: z.string().optional(),
});

// Infer TypeScript types from schemas
export type CloverCustomer = z.infer<typeof CloverCustomerSchema>;
export type CloverEmailAddress = z.infer<typeof CloverEmailAddressSchema>;
export type CloverPhoneNumber = z.infer<typeof CloverPhoneNumberSchema>;
export type CloverCard = z.infer<typeof CloverCardSchema>;
export type CloverAddress = z.infer<typeof CloverAddressSchema>;
export type CloverMetadata = z.infer<typeof CloverMetadataSchema>;
export type CloverOrder = z.infer<typeof CloverOrderSchema>;

// Card analysis schemas for our internal use
export const CardAnalysisSchema = z.object({
  card: CloverCardSchema,
  status: z.enum(['valid', 'expired', 'expiring-soon', 'no-expiration']),
  daysUntil: z.number(),
});

export const CustomerWithAnalysisSchema = CloverCustomerSchema.extend({
  // Add our analysis fields
  merchantId: z.string(),
  merchantCurrency: z.enum(['USD', 'CAD']),
  cards: z.array(CardAnalysisSchema),
  hasExpired: z.boolean(),
  hasExpiringSoon: z.boolean(),
  totalCards: z.number(),
  primaryEmail: z.string().optional(),
  primaryPhone: z.string().optional(),
});

export type CardAnalysis = z.infer<typeof CardAnalysisSchema>;
export type CustomerWithAnalysis = z.infer<typeof CustomerWithAnalysisSchema>;

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const CustomerListResponseSchema = z.object({
  customers: z.array(CustomerWithAnalysisSchema),
  pagination: PaginationSchema,
  timestamp: z.string(),
});

export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;