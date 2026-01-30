package com.expensemgmt.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record DashboardResponse(
    NetWorthSummary netWorth,
    CashFlowSummary cashFlow,
    List<AccountSummary> accountsSummary,
    List<CategoryExpense> expenseByCategory
) {
    public record NetWorthSummary(BigDecimal current, BigDecimal previousMonth, BigDecimal changePercent) {}
    public record CashFlowSummary(BigDecimal income, BigDecimal expenses, BigDecimal net) {}
    public record AccountSummary(UUID id, String name, BigDecimal balance) {}
    public record CategoryExpense(String category, BigDecimal amount, BigDecimal percent) {}
}
