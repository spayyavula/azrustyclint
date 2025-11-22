// Azure Database for PostgreSQL Flexible Server

param location string
param environment string
param tags object

@secure()
param administratorPassword string

var serverName = 'psql-rustyclint-${environment}'
var skuName = environment == 'prod' ? 'Standard_D2s_v3' : 'Standard_B1ms'
var storageSizeGB = environment == 'prod' ? 128 : 32

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: environment == 'prod' ? 'GeneralPurpose' : 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: 'rustyclint'
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: environment == 'prod' ? 35 : 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: 'rustyclint'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allow Azure services
resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output fqdn string = postgres.properties.fullyQualifiedDomainName
output serverName string = postgres.name
