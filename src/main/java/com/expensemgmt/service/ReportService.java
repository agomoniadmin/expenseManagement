package com.expensemgmt.service;

import com.expensemgmt.domain.entity.Account;
import com.expensemgmt.domain.entity.ItemCategory;
import com.expensemgmt.domain.entity.Transaction;
import com.expensemgmt.domain.enums.TransactionType;
import com.expensemgmt.dto.response.DashboardResponse;
import com.expensemgmt.dto.response.DashboardResponse.*;
import com.expensemgmt.repository.AccountRepository;
import com.expensemgmt.repository.CategoryRepository;
import com.expensemgmt.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    public DashboardResponse getDashboard(UUID userId) {
        List<Account> accounts = accountRepository.findByUserIdAndIsActiveTrue(userId);

        // Net worth
        BigDecimal currentNetWorth = accounts.stream()
                .map(Account::getCurrentBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Cash flow for current month
        LocalDate now = LocalDate.now();
        LocalDate monthStart = now.withDayOfMonth(1);
        var txnPage = transactionRepository.findByUserIdAndTransactionDateBetween(
                userId, monthStart, now, PageRequest.of(0, 10000));

        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        Map<UUID, BigDecimal> categoryTotals = new HashMap<>();

        for (Transaction t : txnPage.getContent()) {
            if (t.getTransactionType() == TransactionType.CREDIT ||
                t.getTransactionType() == TransactionType.TRANSFER_IN) {
                income = income.add(t.getAmount());
            } else {
                expenses = expenses.add(t.getAmount());
                if (t.getCategoryId() != null) {
                    categoryTotals.merge(t.getCategoryId(), t.getAmount(), BigDecimal::add);
                }
            }
        }

        // Accounts summary
        List<AccountSummary> accountsSummary = accounts.stream()
                .map(a -> new AccountSummary(a.getId(), a.getName(), a.getCurrentBalance()))
                .toList();

        // Category expenses
        BigDecimal totalExp = expenses.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : expenses;
        List<CategoryExpense> categoryExpenses = categoryTotals.entrySet().stream()
                .map(entry -> {
                    String catName = categoryRepository.findById(entry.getKey())
                            .map(ItemCategory::getName).orElse("Unknown");
                    BigDecimal pct = entry.getValue()
                            .divide(totalExp, 2, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100));
                    return new CategoryExpense(catName, entry.getValue(), pct);
                })
                .sorted((a, b) -> b.amount().compareTo(a.amount()))
                .toList();

        BigDecimal changePercent = BigDecimal.ZERO;
        return new DashboardResponse(
                new NetWorthSummary(currentNetWorth, currentNetWorth, changePercent),
                new CashFlowSummary(income, expenses, income.subtract(expenses)),
                accountsSummary,
                categoryExpenses
        );
    }
}
