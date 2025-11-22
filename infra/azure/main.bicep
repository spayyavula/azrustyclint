// RustyClint Azure Infrastructure
// Deploy with: az deployment sub create --location eastus --template-file main.bicep --parameters main.parameters.json

targetScope = 'subscription'

@description('Environment name')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure region')
param location string = 'eastus'

@description('PostgreSQL administrator password')
@secure()
param postgresPassword string

@description('Redis password')
@secure()
param redisPassword string

@description('JWT secret for authentication')
@secure()
param jwtSecret string

var resourceGroupName = 'rg-rustyclint-${environment}'
var tags = {
  environment: environment
  project: 'rustyclint'
}

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// Container Registry
module acr 'modules/acr.bicep' = {
  scope: rg
  name: 'acr'
  params: {
    location: location
    environment: environment
    tags: tags
  }
}

// AKS Cluster
module aks 'modules/aks.bicep' = {
  scope: rg
  name: 'aks'
  params: {
    location: location
    environment: environment
    tags: tags
    acrId: acr.outputs.acrId
  }
}

// PostgreSQL
module postgres 'modules/postgres.bicep' = {
  scope: rg
  name: 'postgres'
  params: {
    location: location
    environment: environment
    tags: tags
    administratorPassword: postgresPassword
  }
}

// Redis Cache
module redis 'modules/redis.bicep' = {
  scope: rg
  name: 'redis'
  params: {
    location: location
    environment: environment
    tags: tags
  }
}

// Storage Account
module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storage'
  params: {
    location: location
    environment: environment
    tags: tags
  }
}

// Outputs
output resourceGroupName string = rg.name
output acrLoginServer string = acr.outputs.loginServer
output aksName string = aks.outputs.clusterName
output postgresHost string = postgres.outputs.fqdn
output redisHost string = redis.outputs.hostName
output storageAccountName string = storage.outputs.accountName
