package com.expensemgmt.service;

import com.expensemgmt.domain.entity.Account;
import com.expensemgmt.domain.enums.AccountType;
import com.expensemgmt.dto.request.CreateAccountRequest;
import com.expensemgmt.dto.response.AccountResponse;
import com.expensemgmt.exception.EntityNotFoundException;
import com.expensemgmt.repository.AccountRepository;
import com.expensemgmt.repository.LedgerEntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock private AccountRepository accountRepository;
    @Mock private LedgerEntryRepository ledgerEntryRepository;

    @InjectMocks private AccountService accountService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void createAccount_shouldSaveAndReturnResponse() {
        CreateAccountRequest request = new CreateAccountRequest(
                "CHECKING", "Primary Checking", "Chase Bank", "USD", null, null, null);

        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> {
            Account a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        AccountResponse response = accountService.createAccount(userId, request);

        assertNotNull(response);
        assertEquals("CHECKING", response.type());
        assertEquals("Primary Checking", response.name());
        assertEquals("Chase Bank", response.institution());
        verify(accountRepository).save(any(Account.class));
    }

    @Test
    void getAccounts_shouldReturnUserAccounts() {
        Account account = Account.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .accountType(AccountType.CHECKING)
                .name("Test Account")
                .currentBalance(new BigDecimal("1000.00"))
                .build();

        when(accountRepository.findByUserIdAndIsActiveTrue(userId)).thenReturn(List.of(account));

        List<AccountResponse> results = accountService.getAccounts(userId);

        assertEquals(1, results.size());
        assertEquals("Test Account", results.get(0).name());
    }

    @Test
    void getAccount_shouldThrowWhenNotFound() {
        UUID accountId = UUID.randomUUID();
        when(accountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> accountService.getAccount(userId, accountId));
    }

    @Test
    void updateBalance_debitShouldSubtract() {
        UUID accountId = UUID.randomUUID();
        Account account = Account.builder()
                .id(accountId)
                .currentBalance(new BigDecimal("1000.00"))
                .build();

        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(accountRepository.save(any())).thenReturn(account);

        accountService.updateBalance(accountId, new BigDecimal("100.00"), "DEBIT");

        assertEquals(new BigDecimal("900.00"), account.getCurrentBalance());
    }

    @Test
    void updateBalance_creditShouldAdd() {
        UUID accountId = UUID.randomUUID();
        Account account = Account.builder()
                .id(accountId)
                .currentBalance(new BigDecimal("1000.00"))
                .build();

        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(accountRepository.save(any())).thenReturn(account);

        accountService.updateBalance(accountId, new BigDecimal("200.00"), "CREDIT");

        assertEquals(new BigDecimal("1200.00"), account.getCurrentBalance());
    }
}
