package com.expensemgmt.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DashboardResponse(
    NetWorthSummary netWorth,
    CashFlowSummary cashFlow,
    List<MonthlyCashFlow> monthlyCashFlow,
    List<AccountSummary> accountsSummary,
    List<CategoryExpense> expenseByCategory,
    List<RecentTransaction> recentTransactions
) {
    public record NetWorthSummary(BigDecimal current, BigDecimal previousMonth, BigDecimal changePercent) {}
    public record CashFlowSummary(BigDecimal income, BigDecimal expenses, BigDecimal net) {}
    public record MonthlyCashFlow(String month, BigDecimal income, BigDecimal expenses) {}
    public record AccountSummary(UUID id, String name, BigDecimal balance) {}
    public record CategoryExpense(String category, BigDecimal amount, BigDecimal percent) {}
    public record RecentTransaction(UUID id, LocalDate date, String merchant, BigDecimal amount, String type) {}
}
