package com.expensemgmt.integration;

import com.expensemgmt.dto.request.*;
import com.expensemgmt.dto.response.AuthResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AccountTransactionIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private static String accessToken;
    private static String accountId;

    @Test
    @Order(1)
    void setup_registerUser() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "accttest@test.com", "SecurePass123!", "Account", "Test", null);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(), AuthResponse.class);
        accessToken = response.accessToken();
    }

    @Test
    @Order(2)
    void createAccount_shouldReturn201() throws Exception {
        CreateAccountRequest request = new CreateAccountRequest(
                "CHECKING", "Test Checking", "Test Bank", "USD", null, null, null, null);

        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Checking"))
                .andExpect(jsonPath("$.type").value("CHECKING"))
                .andReturn();

        accountId = objectMapper.readTree(
                result.getResponse().getContentAsString()).get("id").asText();
    }

    @Test
    @Order(3)
    void getAccounts_shouldReturnList() throws Exception {
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Test Checking"));
    }

    @Test
    @Order(4)
    void createTransaction_shouldReturn201() throws Exception {
        CreateTransactionRequest request = new CreateTransactionRequest(
                UUID.fromString(accountId), LocalDate.now(), "Whole Foods", new BigDecimal("127.45"),
                "DEBIT", new BigDecimal("8.95"), "Grocery shopping", null, null,
                List.of(new LineItemRequest("Organic Milk", new BigDecimal("2"), "gallon",
                        new BigDecimal("6.99"), null)));

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.merchant").value("Whole Foods"))
                .andExpect(jsonPath("$.amount").value(127.45))
                .andExpect(jsonPath("$.type").value("DEBIT"));
    }

    @Test
    @Order(5)
    void getTransactions_shouldReturnResults() throws Exception {
        mockMvc.perform(get("/api/v1/transactions")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("startDate", LocalDate.now().minusDays(1).toString())
                        .param("endDate", LocalDate.now().plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].merchant").value("Whole Foods"));
    }

    @Test
    @Order(6)
    void createTransfer_shouldReturn201() throws Exception {
        // Create second account
        CreateAccountRequest acctReq = new CreateAccountRequest(
                "CREDIT_CARD", "Test Credit Card", "Test Bank", "USD",
                new BigDecimal("10000"), null, null, null);

        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(acctReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String secondAccountId = objectMapper.readTree(
                result.getResponse().getContentAsString()).get("id").asText();

        TransferRequest transferReq = new TransferRequest(
                UUID.fromString(accountId), UUID.fromString(secondAccountId),
                new BigDecimal("500.00"), "Credit Card Payment");

        mockMvc.perform(post("/api/v1/transactions/transfer")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("TRANSFER_OUT"));
    }

    @Test
    @Order(7)
    void getCategories_shouldReturnHierarchy() throws Exception {
        mockMvc.perform(get("/api/v1/categories")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(8)
    void getDashboard_shouldReturnData() throws Exception {
        mockMvc.perform(get("/api/v1/reports/dashboard")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cashFlow").exists())
                .andExpect(jsonPath("$.accountsSummary").isArray());
    }

    @Test
    @Order(9)
    void getReconciliationCandidates_shouldReturnList() throws Exception {
        mockMvc.perform(get("/api/v1/reconciliation/candidates")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("accountId", accountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(10)
    void validation_shouldReturn400ForInvalidInput() throws Exception {
        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
