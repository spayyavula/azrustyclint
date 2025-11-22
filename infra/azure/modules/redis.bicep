// Azure Cache for Redis

param location string
param environment string
param tags object

var redisName = 'redis-rustyclint-${environment}'
var skuName = environment == 'prod' ? 'Standard' : 'Basic'
var capacity = environment == 'prod' ? 1 : 0

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  tags: tags
  properties: {
    sku: {
      name: skuName
      family: 'C'
      capacity: capacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'volatile-lru'
    }
  }
}

output hostName string = redis.properties.hostName
output sslPort int = redis.properties.sslPort
output redisName string = redis.name
