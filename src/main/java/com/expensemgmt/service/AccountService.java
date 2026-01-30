package com.expensemgmt.service;

import com.expensemgmt.domain.entity.Account;
import com.expensemgmt.domain.entity.LedgerEntry;
import com.expensemgmt.domain.enums.AccountType;
import com.expensemgmt.dto.request.CreateAccountRequest;
import com.expensemgmt.dto.response.AccountResponse;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.AccountRepository;
import com.expensemgmt.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    @Transactional
    public AccountResponse createAccount(UUID userId, CreateAccountRequest request) {
        Account account = Account.builder()
                .userId(userId)
                .userRegion("us-east-1")
                .accountType(AccountType.valueOf(request.type()))
                .name(request.name())
                .institution(request.institution())
                .currency(request.currency() != null ? request.currency() : "USD")
                .creditLimit(request.creditLimit())
                .build();

        account = accountRepository.save(account);
        return mapToResponse(account);
    }

    public List<AccountResponse> getAccounts(UUID userId) {
        return accountRepository.findByUserIdAndIsActiveTrue(userId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public AccountResponse getAccount(UUID userId, UUID accountId) {
        Account account = accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Account", accountId));
        return mapToResponse(account);
    }

    public List<LedgerEntry> getLedger(UUID userId, UUID accountId, LocalDate start, LocalDate end) {
        accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Account", accountId));
        return ledgerEntryRepository.findByAccountIdAndEntryDateBetweenOrderByEntryDateDescCreatedAtDesc(
                accountId, start, end);
    }

    @Transactional
    public void updateBalance(UUID accountId, BigDecimal amount, String entryType) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account", accountId));
        if ("DEBIT".equals(entryType)) {
            account.setCurrentBalance(account.getCurrentBalance().subtract(amount));
        } else {
            account.setCurrentBalance(account.getCurrentBalance().add(amount));
        }
        accountRepository.save(account);
    }

    private AccountResponse mapToResponse(Account a) {
        return new AccountResponse(
                a.getId(), a.getAccountType().name(), a.getName(), a.getInstitution(),
                a.getCurrency(), a.getCurrentBalance(), a.getAvailableBalance(),
                a.getLastSyncedAt(), a.isActive() ? "ACTIVE" : "INACTIVE");
    }
}
