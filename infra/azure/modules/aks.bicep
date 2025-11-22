// Azure Kubernetes Service

param location string
param environment string
param tags object
param acrId string

var aksName = 'aks-rustyclint-${environment}'
var nodeCount = environment == 'prod' ? 2 : 1
var vmSize = 'Standard_B2s'

resource aks 'Microsoft.ContainerService/managedClusters@2023-10-01' = {
  name: aksName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    dnsPrefix: 'rustyclint-${environment}'
    kubernetesVersion: '1.31'
    enableRBAC: true
    agentPoolProfiles: [
      {
        name: 'default'
        count: nodeCount
        vmSize: vmSize
        osType: 'Linux'
        mode: 'System'
        enableAutoScaling: false
        minCount: null
        maxCount: null
      }
    ]
    networkProfile: {
      networkPlugin: 'azure'
      serviceCidr: '10.0.0.0/16'
      dnsServiceIP: '10.0.0.10'
    }
  }
}

// Grant AKS access to ACR
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aks.id, acrId, 'acrpull')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: aks.properties.identityProfile.kubeletidentity.objectId
    principalType: 'ServicePrincipal'
  }
}

output clusterName string = aks.name
output clusterFqdn string = aks.properties.fqdn
