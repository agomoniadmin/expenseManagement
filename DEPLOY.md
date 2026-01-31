# Personal Expense Management System - Build, Deploy & Test Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development (Without Docker)](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Running Tests](#running-tests)
5. [API Quick Reference](#api-quick-reference)
6. [AWS Deployment](#aws-deployment)
7. [AWS Account Requirements](#aws-account-requirements)

---

## Prerequisites

### Local Development
- **Java 17+** (Eclipse Temurin/Adoptium recommended)
- **Node.js 20+** (for frontend development)
- **PostgreSQL 16** (local install or Docker)
- **Redis 7** (optional, for caching)
- **Git**

### Docker Deployment
- **Docker Desktop** (Docker Engine 24+ with Docker Compose V2)
- No Java or Node.js installation required

### Verify Prerequisites
```bash
java -version        # Should show 17+
node -v              # Should show 20+
docker --version     # Should show 24+
docker compose version  # Should show v2+
```

---

## Local Development

### 1. Start Database Services

Option A - Use Docker for databases only:
```bash
docker run -d --name expense-db \
  -e POSTGRES_DB=expense_mgmt \
  -e POSTGRES_USER=expense_user \
  -e POSTGRES_PASSWORD=expense_pass \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d --name expense-redis \
  -p 6379:6379 \
  redis:7-alpine
```

Option B - Use locally installed PostgreSQL:
```bash
createdb expense_mgmt
psql expense_mgmt -c "CREATE USER expense_user WITH PASSWORD 'expense_pass';"
psql expense_mgmt -c "GRANT ALL PRIVILEGES ON DATABASE expense_mgmt TO expense_user;"
psql expense_mgmt -c "GRANT ALL ON SCHEMA public TO expense_user;"
```

### 2. Build the Application
```bash
cd expenseManagement
./gradlew build
```

### 3. Run the Application
```bash
./gradlew bootRun
```

Or with custom environment:
```bash
DB_HOST=localhost DB_PORT=5432 DB_NAME=expense_mgmt \
DB_USER=expense_user DB_PASSWORD=expense_pass \
./gradlew bootRun
```

### 4. Verify It's Running
```bash
curl http://localhost:8080/api/health
# Should return: {"status":"UP","timestamp":"...","version":"1.0.0"}
```

### 5. Access Swagger UI
Open in browser: http://localhost:8080/swagger-ui.html

---

## Docker Deployment

### 1. Build and Start All Services
```bash
cd expenseManagement
docker compose up --build -d
```

This starts:
- **PostgreSQL 16** on port 5432
- **Redis 7** on port 6379
- **Backend API** on port 8080
- **Frontend UI** on port 3000 (nginx reverse-proxies `/api/` to backend)

### 2. Check Service Status
```bash
docker compose ps
docker compose logs app       # View application logs
docker compose logs -f app    # Follow logs in real-time
```

### 3. Verify Deployment
```bash
# Backend API
curl http://localhost:8080/api/health

# Frontend UI
open http://localhost:3000
```

### 4. Stop Services
```bash
docker compose down           # Stop containers
docker compose down -v        # Stop and delete data volumes
```

### 5. Rebuild After Code Changes
```bash
docker compose up --build -d
```

---

## Running Tests

### Unit Tests
```bash
./gradlew test
```

Tests include:
- `AuthServiceTest` - Registration, login, token refresh, credential validation
- `AccountServiceTest` - Account CRUD, balance updates
- `TransactionServiceTest` - Transaction creation, updates, transfers
- `CategoryServiceTest` - Category hierarchy, mapping rules, merchant matching
- `ImportServiceTest` - CSV parsing, duplicate detection, error handling
- `ReconciliationServiceTest` - Match scoring, candidate filtering

### Integration Tests
```bash
./gradlew test --tests "com.expensemgmt.integration.*"
```

Integration tests run against an in-memory H2 database and test:
- End-to-end auth flow (register, login, token usage)
- Account creation and retrieval
- Transaction lifecycle (create, search, update)
- Inter-account transfers
- Dashboard reporting
- Input validation

### View Test Reports
```bash
open build/reports/tests/test/index.html   # macOS
xdg-open build/reports/tests/test/index.html  # Linux
```

### Functional Tests (Against Running Docker)
```bash
# Start Docker services first
docker compose up --build -d

# Wait for startup, then run functional tests
./scripts/functional-test.sh
```

### Frontend E2E Tests (Against Running Docker)
```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install --with-deps chromium

# Run E2E tests (backend must be running)
npm run test:e2e

# Run E2E with UI mode
npm run test:e2e:ui
```

### Frontend Development
```bash
cd frontend
npm install     # Install dependencies (first time)
npm run dev     # Dev server at http://localhost:3000 (proxies /api to :8080)
npm run build   # Production build to dist/
npm run lint    # ESLint check
```

The functional test script exercises all 15 API capabilities:
1. Health check
2. User registration
3. User login
4. Account creation
5. Account listing
6. Transaction creation with line items
7. Transaction search with filters
8. Transaction updates
9. Inter-account transfers
10. Category listing
11. Category mapping rules
12. Dashboard reports
13. CSV statement import
14. Reconciliation candidates
15. Input validation

---

## API Quick Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate tokens |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/accounts` | List all accounts |
| POST | `/api/v1/accounts` | Create account |
| GET | `/api/v1/accounts/{id}` | Get account details |
| GET | `/api/v1/accounts/{id}/ledger` | Get ledger entries |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/transactions` | Create transaction |
| GET | `/api/v1/transactions` | Search transactions |
| GET | `/api/v1/transactions/{id}` | Get transaction |
| PATCH | `/api/v1/transactions/{id}` | Update transaction |
| POST | `/api/v1/transactions/transfer` | Inter-account transfer |

### Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/import/upload` | Upload CSV statement |
| GET | `/api/v1/import/jobs/{id}` | Get import job status |
| GET | `/api/v1/import/jobs` | List import jobs |

### Reconciliation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reconciliation/candidates` | Get match candidates |
| POST | `/api/v1/reconciliation/confirm` | Confirm a match |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | Get category tree |
| POST | `/api/v1/categories` | Create category |
| POST | `/api/v1/categories/mappings` | Create auto-categorization rule |
| GET | `/api/v1/categories/mappings` | List mapping rules |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/dashboard` | Get dashboard data |

All authenticated endpoints require header: `Authorization: Bearer <access_token>`

---

## AWS Deployment

### Architecture Overview

For production AWS deployment following the LLD's multi-region Active/Active architecture:

```
Route 53 (DNS)
    |
CloudFront (CDN)
    |
ALB (Application Load Balancer)
    |
EKS (Kubernetes Cluster)
    ├── expense-api pods (3+ replicas across 3 AZs)
    |
RDS PostgreSQL (Multi-AZ)
    |
ElastiCache Redis (Cluster Mode)
```

### Step-by-Step AWS Deployment

#### 1. Infrastructure Setup (Terraform/CloudFormation)

Create a VPC with public/private subnets across 3 AZs:
```bash
# Install AWS CLI and configure
aws configure
# Enter your Access Key, Secret Key, Region (us-east-1)
```

#### 2. Create RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier expense-db \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 16 \
  --master-username expense_admin \
  --master-user-password <secure-password> \
  --allocated-storage 100 \
  --multi-az \
  --db-name expense_mgmt \
  --vpc-security-group-ids <sg-id> \
  --db-subnet-group-name <subnet-group>
```

#### 3. Create ElastiCache Redis
```bash
aws elasticache create-replication-group \
  --replication-group-id expense-redis \
  --replication-group-description "Expense Management Cache" \
  --engine redis \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 3 \
  --automatic-failover-enabled
```

#### 4. Create ECR Repository and Push Image
```bash
# Create repository
aws ecr create-repository --repository-name expense-management

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t expense-management .
docker tag expense-management:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/expense-management:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/expense-management:latest
```

#### 5. Create EKS Cluster
```bash
eksctl create cluster \
  --name expense-cluster \
  --region us-east-1 \
  --nodegroup-name workers \
  --node-type t3.large \
  --nodes 6 \
  --nodes-min 3 \
  --nodes-max 20 \
  --managed
```

#### 6. Deploy to Kubernetes

Create Kubernetes manifests (deployment.yaml):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: expense-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: expense-api
  template:
    metadata:
      labels:
        app: expense-api
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: expense-api
              topologyKey: topology.kubernetes.io/zone
      containers:
        - name: expense-api
          image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/expense-management:latest
          ports:
            - containerPort: 8080
          env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: expense-secrets
                  key: db-host
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: expense-secrets
                  key: db-password
            - name: REDIS_HOST
              valueFrom:
                secretKeyRef:
                  name: expense-secrets
                  key: redis-host
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: expense-secrets
                  key: jwt-secret
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          readinessProbe:
            httpGet:
              path: /api/health
              port: 8080
            initialDelaySeconds: 30
          livenessProbe:
            httpGet:
              path: /api/health
              port: 8080
            initialDelaySeconds: 60
---
apiVersion: v1
kind: Service
metadata:
  name: expense-api
spec:
  selector:
    app: expense-api
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: expense-api
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: expense-api
                port:
                  number: 80
```

```bash
kubectl apply -f deployment.yaml
```

#### 7. Set Up Route 53
```bash
aws route53 create-hosted-zone --name expense-mgmt.com --caller-reference $(date +%s)
```

---

## AWS Account Requirements

Since you don't have an AWS account, here's what you need to procure:

### 1. AWS Account
- Sign up at https://aws.amazon.com
- Requires a credit card for billing
- New accounts get 12 months of Free Tier

### 2. Estimated Monthly Costs (Single Region, Production)

| Service | Configuration | Est. Monthly Cost |
|---------|--------------|-------------------|
| **EKS Cluster** | 1 cluster | $73 |
| **EC2 Worker Nodes** | 3x t3.large (on-demand) | $180 |
| **RDS PostgreSQL** | db.r6g.large, Multi-AZ | $350 |
| **ElastiCache Redis** | cache.r6g.large, 3 nodes | $450 |
| **ALB** | 1 load balancer | $25 |
| **ECR** | Image storage | $5 |
| **Route 53** | Hosted zone + queries | $5 |
| **CloudWatch** | Logs + metrics | $30 |
| **Data Transfer** | Moderate traffic | $50 |
| **Total (Single Region)** | | **~$1,168/month** |

### 3. Multi-Region (3 Regions) Costs
Multiply by ~3 for the full Active/Active setup described in the LLD:
- **Estimated: ~$3,500/month**
- Add cross-region data transfer: ~$200/month
- Add Route 53 health checks: ~$15/month

### 4. Cost Optimization Options
- **Reserved Instances**: Save 30-60% on EC2/RDS with 1-year commitment
- **Savings Plans**: Save up to 72% on compute
- **Spot Instances**: Save up to 90% for non-critical worker nodes
- **Start Small**: Use t3.medium instances and scale up as needed
- **Single Region First**: Start with 1 region (~$1,168/mo), expand later

### 5. Required AWS Services to Enable
- **IAM** - Identity and Access Management (free, set up first)
- **VPC** - Virtual Private Cloud (free)
- **EKS** - Elastic Kubernetes Service
- **ECR** - Elastic Container Registry
- **RDS** - Relational Database Service
- **ElastiCache** - Managed Redis
- **ALB** - Application Load Balancer
- **Route 53** - DNS service
- **CloudWatch** - Monitoring and logging
- **Secrets Manager** - For credentials ($0.40/secret/month)
- **KMS** - Key Management Service ($1/key/month)
- **S3** - For file storage (import files, backups)
- **Certificate Manager** - SSL/TLS certificates (free)

### 6. Tools to Install
```bash
# AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"  # macOS
sudo installer -pkg AWSCLIV2.pkg -target /

# eksctl (EKS cluster management)
brew install eksctl  # macOS

# kubectl (Kubernetes CLI)
brew install kubectl  # macOS

# Helm (Kubernetes package manager)
brew install helm  # macOS
```

### 7. Domain Name (Optional)
- Register a domain via Route 53 (~$12/year for .com)
- Or use an existing domain and point nameservers to Route 53

### 8. SSL/TLS Certificate
- Free via AWS Certificate Manager
- Automatically renews
- Attach to ALB for HTTPS

---

## Troubleshooting

### Docker Build Fails
```bash
# Clean Docker cache and rebuild
docker compose down -v
docker system prune -f
docker compose up --build -d
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker compose ps postgres
docker compose logs postgres

# Connect manually
docker exec -it expense-db psql -U expense_user -d expense_mgmt
```

### Application Won't Start
```bash
# Check full application logs
docker compose logs --tail=100 app

# Common issues:
# - Database not ready: check depends_on and healthcheck
# - Port conflict: change SERVER_PORT in docker-compose.yml
# - Memory: increase Docker Desktop memory allocation
```

### Tests Fail
```bash
# Run with verbose output
./gradlew test --info

# Run specific test class
./gradlew test --tests "com.expensemgmt.service.AuthServiceTest"
```
