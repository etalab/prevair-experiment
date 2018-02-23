const kdbush = require('kdbush')
const geokdbush = require('geokdbush')

function createSpatialIndex(records) {
  const spatialIndex = kdbush(records, p => p.lon, p => p.lat)

  return {
    search({lon, lat}) {
      const results = geokdbush.around(spatialIndex, lon, lat, 1, 15)
      if (results.length === 0) {
        return
      }
      return results[0]
    }
  }
}

module.exports = {createSpatialIndex}
