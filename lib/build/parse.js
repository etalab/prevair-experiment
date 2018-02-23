const NetCDFReader = require('netcdfjs')
const {min, max} = require('lodash')

function parseNetCDF(buffer) {
  return new NetCDFReader(buffer)
}

function fixPrecision(float, precision) {
  const factor = Math.pow(10, precision)
  return Math.round(float * factor) / factor
}

async function parseDataset(buffer) {
  const data = parseNetCDF(buffer)

  const variable = data.variables.find(v => !['time', 'lon', 'lat'].includes(v.name))

  const longitudes = data.getDataVariable('lon')
  const latitudes = data.getDataVariable('lat')

  const [values] = data.getDataVariable(variable.name)

  const records = []

  latitudes.forEach((lat, latIndex) => {
    longitudes.forEach((lon, lonIndex) => {
      const index = (latIndex * longitudes.length) + lonIndex
      const value = values[index]
      records.push({
        lon: fixPrecision(lon, 3),
        lat: fixPrecision(lat, 3),
        value: fixPrecision(value, 2)
      })
    })
  })

  const metadata = {
    variableName: variable.name,
    minValue: fixPrecision(min(values), 2),
    maxValue: fixPrecision(max(values), 2),
    minLat: fixPrecision(min(latitudes), 3),
    maxLat: fixPrecision(max(latitudes), 3),
    minLon: fixPrecision(min(longitudes), 3),
    maxLon: fixPrecision(max(longitudes), 3)
  }

  return {metadata, records}
}

module.exports = {parseDataset}
