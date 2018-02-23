const fs = require('fs')
const {promisify} = require('util')
const NetCDFReader = require('netcdfjs')
const {min, max} = require('lodash')

const readFile = promisify(fs.readFile)

function parseNetCDF(rawData) {
  return new NetCDFReader(rawData)
}

async function parseDataset(path) {
  const rawData = await readFile(path)
  const data = parseNetCDF(rawData)

  const variable = data.variables.find(v => !['time', 'lon', 'lat'].includes(v.name))

  const longitudes = data.getDataVariable('lon')
  const latitudes = data.getDataVariable('lat')

  const [values] = data.getDataVariable(variable.name)

  const records = []

  latitudes.forEach((lat, latIndex) => {
    longitudes.forEach((lon, lonIndex) => {
      const index = (latIndex * longitudes.length) + lonIndex
      const value = values[index]
      records.push({lon, lat, value})
    })
  })

  const metadata = {
    variableName: variable.name,
    minValue: min(values),
    maxValue: max(values),
    minLat: min(latitudes),
    maxLat: max(latitudes),
    minLon: min(longitudes),
    maxLon: max(longitudes)
  }

  return {metadata, records}
}

module.exports = {parseDataset}
