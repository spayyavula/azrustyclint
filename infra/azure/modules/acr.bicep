// Azure Container Registry

param location string
param environment string
param tags object

var acrName = 'acrustyclint${environment}'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: environment == 'prod' ? 'Premium' : 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

output acrId string = acr.id
output loginServer string = acr.properties.loginServer
output acrName string = acr.name
