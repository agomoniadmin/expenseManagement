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
import java.time.format.TextStyle;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    public DashboardResponse getDashboard(UUID userId, String period) {
        List<Account> accounts = accountRepository.findByUserIdAndIsActiveTrue(userId);

        // Net worth (always current)
        BigDecimal currentNetWorth = accounts.stream()
                .map(Account::getCurrentBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate date range based on period
        LocalDate now = LocalDate.now();
        DateRange range = calculateDateRange(period, now);

        // Get transactions for the selected period
        var txnPage = transactionRepository.findByUserIdAndTransactionDateBetween(
                userId, range.start, range.end, PageRequest.of(0, 10000));

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

        // Monthly cash flow based on period
        List<MonthlyCashFlow> monthlyCashFlow = computeMonthlyCashFlow(userId, period, now);

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

        // Fetch recent transactions (last 5)
        var recentTxnPage = transactionRepository.findByUserIdAndTransactionDateBetween(
                userId, now.minusMonths(3), now, PageRequest.of(0, 5, org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "transactionDate")));

        List<DashboardResponse.RecentTransaction> recentTransactions = recentTxnPage.getContent().stream()
                .map(t -> new DashboardResponse.RecentTransaction(
                        t.getId(),
                        t.getTransactionDate(),
                        t.getMerchant(),
                        t.getAmount(),
                        t.getTransactionType().name()))
                .toList();

        return new DashboardResponse(
                new NetWorthSummary(currentNetWorth, currentNetWorth, changePercent),
                new CashFlowSummary(income, expenses, income.subtract(expenses)),
                monthlyCashFlow,
                accountsSummary,
                categoryExpenses,
                recentTransactions
        );
    }

    private record DateRange(LocalDate start, LocalDate end) {}

    private DateRange calculateDateRange(String period, LocalDate now) {
        return switch (period) {
            case "last-month" -> {
                LocalDate lastMonth = now.minusMonths(1);
                yield new DateRange(
                    lastMonth.withDayOfMonth(1),
                    lastMonth.with(TemporalAdjusters.lastDayOfMonth())
                );
            }
            case "last-3-months" -> new DateRange(
                now.minusMonths(3).withDayOfMonth(1),
                now
            );
            case "last-6-months" -> new DateRange(
                now.minusMonths(6).withDayOfMonth(1),
                now
            );
            case "ytd" -> new DateRange(
                now.withDayOfYear(1),
                now
            );
            case "last-year" -> {
                LocalDate lastYear = now.minusYears(1);
                yield new DateRange(
                    lastYear.withDayOfYear(1),
                    lastYear.with(TemporalAdjusters.lastDayOfYear())
                );
            }
            default -> new DateRange(  // "this-month"
                now.withDayOfMonth(1),
                now
            );
        };
    }

    private List<MonthlyCashFlow> computeMonthlyCashFlow(UUID userId, String period, LocalDate now) {
        int months = switch (period) {
            case "last-month" -> 1;
            case "last-3-months" -> 3;
            case "last-6-months" -> 6;
            case "ytd" -> now.getMonthValue();
            case "last-year" -> 12;
            default -> 1; // "this-month"
        };

        // Adjust reference date for "last-month" and "last-year"
        LocalDate referenceDate = switch (period) {
            case "last-month" -> now.minusMonths(1).with(TemporalAdjusters.lastDayOfMonth());
            case "last-year" -> now.minusYears(1).with(TemporalAdjusters.lastDayOfYear());
            default -> now;
        };

        List<MonthlyCashFlow> result = new ArrayList<>();

        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthDate = referenceDate.minusMonths(i);
            LocalDate monthStart = monthDate.withDayOfMonth(1);
            LocalDate monthEnd = monthDate.with(TemporalAdjusters.lastDayOfMonth());

            // For current month (when i == 0 and not looking at past periods), use today as end date
            if (i == 0 && (period.equals("this-month") || period.equals("last-3-months") ||
                          period.equals("last-6-months") || period.equals("ytd"))) {
                monthEnd = now;
            }

            var txnPage = transactionRepository.findByUserIdAndTransactionDateBetween(
                    userId, monthStart, monthEnd, PageRequest.of(0, 10000));

            BigDecimal monthIncome = BigDecimal.ZERO;
            BigDecimal monthExpenses = BigDecimal.ZERO;

            for (Transaction t : txnPage.getContent()) {
                if (t.getTransactionType() == TransactionType.CREDIT ||
                    t.getTransactionType() == TransactionType.TRANSFER_IN) {
                    monthIncome = monthIncome.add(t.getAmount());
                } else if (t.getTransactionType() == TransactionType.DEBIT ||
                           t.getTransactionType() == TransactionType.TRANSFER_OUT) {
                    monthExpenses = monthExpenses.add(t.getAmount());
                }
            }

            String monthName = monthDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            result.add(new MonthlyCashFlow(monthName, monthIncome, monthExpenses));
        }

        return result;
    }
}
