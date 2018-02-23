const kdbush = require('kdbush')
const geokdbush = require('geokdbush')
const {parseDataset} = require('./parse')

async function createSpatialIndexAsync(path) {
  const {records} = await parseDataset(path)
  const index = kdbush(records, p => p.lon, p => p.lat)
  return index
}

function createSpatialIndex(path) {
  let _spatialIndex

  return {
    async search({lon, lat}) {
      if (!_spatialIndex) {
        _spatialIndex = createSpatialIndexAsync(path)
      }
      const spatialIndex = await _spatialIndex
      const results = geokdbush.around(spatialIndex, lon, lat, 1, 15)
      if (results.length === 0) {
        return
      }
      return results[0]
    }
  }
}

module.exports = {createSpatialIndex}
