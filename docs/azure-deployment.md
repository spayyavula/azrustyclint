# Azure Deployment Guide

Deploy RustyClint to Azure Kubernetes Service (AKS).

## Prerequisites

- Azure CLI installed and authenticated
- kubectl installed
- An Azure subscription

## Infrastructure Setup

### 1. Create Azure Resources

Deploy the infrastructure using Bicep:

```bash
# Login to Azure
az login

# Create a Key Vault for secrets (if not exists)
az keyvault create \
  --name kv-rustyclint \
  --resource-group rg-rustyclint-shared \
  --location eastus

# Store secrets
az keyvault secret set --vault-name kv-rustyclint --name postgres-password --value "your-secure-password"
az keyvault secret set --vault-name kv-rustyclint --name redis-password --value "your-redis-password"
az keyvault secret set --vault-name kv-rustyclint --name jwt-secret --value "your-jwt-secret"

# Deploy infrastructure
az deployment sub create \
  --location eastus \
  --template-file infra/azure/main.bicep \
  --parameters infra/azure/main.parameters.json \
  --parameters environment=staging
```

### 2. Configure GitHub Secrets

Create an Azure service principal for GitHub Actions:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "github-actions-rustyclint" \
  --role contributor \
  --scopes /subscriptions/<subscription-id> \
  --sdk-auth
```

Add these secrets to your GitHub repository:

- `AZURE_CREDENTIALS`: Output from the above command

### 3. Initial Kubernetes Setup

Get AKS credentials and deploy:

```bash
# Get credentials
az aks get-credentials \
  --resource-group rg-rustyclint-staging \
  --name aks-rustyclint-staging

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create cluster issuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

### 4. Update Secrets

Update the Kubernetes secrets with actual values:

```bash
# Get PostgreSQL password
POSTGRES_PASSWORD=$(az keyvault secret show \
  --vault-name kv-rustyclint \
  --name postgres-password \
  --query value -o tsv)

# Get Redis primary key
REDIS_KEY=$(az redis list-keys \
  --name redis-rustyclint-staging \
  --resource-group rg-rustyclint-staging \
  --query primaryKey -o tsv)

# Get storage connection string
STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name strustyclintstaging \
  --resource-group rg-rustyclint-staging \
  --query connectionString -o tsv)

# Create Kubernetes secret
kubectl create secret generic rustyclint-secrets \
  --namespace rustyclint \
  --from-literal=DATABASE_URL="postgres://rustyclint:${POSTGRES_PASSWORD}@psql-rustyclint-staging.postgres.database.azure.com:5432/rustyclint?sslmode=require" \
  --from-literal=REDIS_URL="rediss://:${REDIS_KEY}@redis-rustyclint-staging.redis.cache.windows.net:6380" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="${STORAGE_CONNECTION}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Deployment

### Automatic Deployment

Push a tag to trigger deployment:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Or use the workflow dispatch in GitHub Actions.

### Manual Deployment

```bash
# Build and push image
az acr build \
  --registry acrustyclintstaging \
  --image rustyclint:latest \
  .

# Deploy to AKS
kubectl apply -k infra/k8s
```

## Monitoring

### View logs

```bash
kubectl logs -f deployment/rustyclint-api -n rustyclint
```

### Check pod status

```bash
kubectl get pods -n rustyclint
kubectl describe pod <pod-name> -n rustyclint
```

### View metrics

```bash
kubectl top pods -n rustyclint
```

## DNS Configuration

1. Get the ingress external IP:

```bash
kubectl get ingress -n rustyclint
```

2. Create an A record in your DNS provider pointing to this IP.

## Scaling

### Manual scaling

```bash
kubectl scale deployment rustyclint-api --replicas=5 -n rustyclint
```

### Autoscaling

The HPA is configured to scale between 2-10 pods based on CPU/memory usage.

## Troubleshooting

### Database connection issues

```bash
# Test connection from a pod
kubectl run -it --rm --image=postgres:16 psql-test -- \
  psql "postgres://rustyclint:PASSWORD@psql-rustyclint-staging.postgres.database.azure.com:5432/rustyclint?sslmode=require"
```

### Redis connection issues

```bash
# Test Redis
kubectl run -it --rm --image=redis:7 redis-test -- \
  redis-cli -h redis-rustyclint-staging.redis.cache.windows.net -p 6380 --tls -a PASSWORD
```

## Cost Optimization

For development/staging:
- Use B-series VMs (burstable)
- Single node AKS cluster
- Basic tier for Redis and PostgreSQL

For production:
- Use D-series VMs
- Enable autoscaling
- Zone-redundant PostgreSQL
- Standard tier Redis
