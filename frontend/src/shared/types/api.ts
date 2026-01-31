// ---- Common ----
export interface PageMeta {
  total: number;
  page: number;
  perPage: number;
}

export interface PageResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiError {
  code: string;
  status: number;
  message: string;
  timestamp: string;
  details: string[];
}

// ---- Auth ----
export interface UserResponse {
  id: string;
  email: string;
  region: string;
  roles: string[];
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  region?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ---- Accounts ----
export interface AccountResponse {
  id: string;
  type: string;
  name: string;
  institution: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  lastSynced: string | null;
  status: string;
}

export interface CreateAccountRequest {
  type: string;
  name: string;
  institution?: string;
  currency?: string;
  creditLimit?: number;
  statementCloseDay?: number;
  paymentDueDay?: number;
  initialBalance?: number;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  transactionId: string;
  entryDate: string;
  amount: number;
  runningBalance: number;
  entryType: string;
  description: string;
}

// ---- Transactions ----
export interface LineItemResponse {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  categoryId: string | null;
}

export interface TransactionResponse {
  id: string;
  accountId: string;
  date: string;
  merchant: string;
  amount: number;
  type: string;
  categoryId: string | null;
  description: string | null;
  reconciliationStatus: string;
  lineItems: LineItemResponse[];
  createdAt: string;
  version: number;
}

export interface LineItemRequest {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice: number;
  categoryId?: string;
}

export interface CreateTransactionRequest {
  accountId: string;
  date: string;
  merchant: string;
  amount: number;
  type: string;
  taxAmount?: number;
  description?: string;
  referenceNumber?: string;
  categoryId?: string;
  lineItems?: LineItemRequest[];
}

export interface UpdateTransactionRequest {
  categoryId?: string;
  notes?: string;
  merchant?: string;
  amount?: number;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
}

// ---- Categories ----
export interface CategoryResponse {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budgetLimit: number | null;
  children: CategoryResponse[];
}

export interface CreateCategoryRequest {
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
  budgetLimit?: number;
}

export interface MappingResponse {
  id: string;
  pattern: string;
  matchType: string;
  categoryId: string;
  priority: number;
  active: boolean;
}

export interface CreateMappingRequest {
  pattern: string;
  matchType: string;
  categoryId: string;
  priority: number;
}

// ---- Import ----
export interface ImportSummary {
  totalRecords: number;
  imported: number;
  duplicates: number;
  matched: number;
  errors: number;
}

export interface ImportError {
  line: number;
  message: string;
}

export interface ImportJobResponse {
  jobId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  summary: ImportSummary;
  errorDetails: ImportError[];
}

// ---- Import Profiles ----
export interface ImportProfileResponse {
  id: string;
  accountId: string;
  profileName: string;
  dateColumn: string;
  merchantColumn: string;
  amountColumn: string;
  typeColumn: string | null;
  dateFormat: string;
  createdAt: string;
}

export interface CreateImportProfileRequest {
  accountId: string;
  profileName: string;
  dateColumn: string;
  merchantColumn: string;
  amountColumn: string;
  typeColumn?: string;
  dateFormat?: string;
}

// ---- Reconciliation ----
export interface TransactionSummary {
  id: string;
  date: string;
  merchant: string;
  amount: number;
}

export interface ReconciliationCandidateResponse {
  matchId: string;
  confidenceScore: number;
  userTransaction: TransactionSummary;
  importedTransaction: TransactionSummary;
}

export interface ConfirmReconciliationRequest {
  matchId: string;
  precedenceOverrides?: Record<string, string>;
}

// ---- Dashboard / Reports ----
export interface NetWorthSummary {
  current: number;
  previousMonth: number;
  changePercent: number;
}

export interface CashFlowSummary {
  income: number;
  expenses: number;
  net: number;
}

export interface MonthlyCashFlow {
  month: string;
  income: number;
  expenses: number;
}

export interface AccountSummary {
  id: string;
  name: string;
  balance: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percent: number;
}

export interface RecentTransaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  type: string;
}

export interface DashboardResponse {
  netWorth: NetWorthSummary;
  cashFlow: CashFlowSummary;
  monthlyCashFlow: MonthlyCashFlow[];
  accountsSummary: AccountSummary[];
  expenseByCategory: CategoryExpense[];
  recentTransactions: RecentTransaction[];
}
