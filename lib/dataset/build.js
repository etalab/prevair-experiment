const fs = require('fs')
const request = require('superagent')
const bluebird = require('bluebird')
const {stringify} = require('JSONStream')
const {parseDataset} = require('./parse')

const ROOT_URL = 'http://public:mdp_public@www.prevair.org/donneesmisadispo/public'

const TYPES_POLLUANTS = ['NO2', 'O3', 'PM10', 'PM25']
const TYPES_PREVISIONS = ['MAXJ0', 'MAXJ1', 'MAXJ2', 'MAXJ3', 'MOYJ0', 'MOYJ1', 'MOYJ2', 'MOYJ3']

const PERIODE = '20180224'

function getURL(typePolluant, typePrevision, periode) {
  return `${ROOT_URL}/PREVAIR.prevision.${periode}.${typePrevision}.${typePolluant}.public.nc`
}

async function getParsedDataset(typePolluant, typePrevision, periode) {
  const response = await request.get(getURL(typePolluant, typePrevision, periode))
    .buffer(true)
    .parse(request.parse['application/octet-stream']) // Force buffering as Buffer
  if (!response.ok || response.header['content-type'] !== 'application/x-netcdf') {
    throw new Error('Réponse du serveur inattendue')
  }
  return parseDataset(response.body)
}

function getStorageKey(typePolluant, typePrevision) {
  return `${typePolluant}-${typePrevision}`
}

async function doStuff() {
  let firstIteration = true
  const result = {metadata: {date: PERIODE}, records: []}

  await bluebird.each(TYPES_POLLUANTS, async typePolluant => {
    return bluebird.each(TYPES_PREVISIONS, async typePrevision => {
      console.log(`Type de polluant : ${typePolluant} - Type de prévision : ${typePrevision}`)
      const variableName = getStorageKey(typePolluant, typePrevision)
      const {metadata, records} = await getParsedDataset(typePolluant, typePrevision, PERIODE)

      if (firstIteration) {
        const {minLon, minLat, maxLon, maxLat} = metadata
        result.metadata = {minLon, minLat, maxLon, maxLat}
      }

      const {minValue, maxValue} = metadata
      result.metadata[variableName] = {minValue, maxValue}

      records.forEach((record, i) => {
        if (firstIteration) {
          result.records[i] = {lat: record.lat, lon: record.lon}
        }
        result.records[i][variableName] = record.value
      })

      firstIteration = false // No-op on subsequent iterations
    })
  })

  await writeJSON(result, 'previsions-latest.json')
}

function writeJSON(result, path) {
  return new Promise(resolve => {
    const output = fs.createWriteStream(path)
    const stringifier = stringify(`{"metadata":${JSON.stringify(result.metadata)},"records":[\n`, ',\n', ']}')
    stringifier.pipe(output)
    result.records.forEach(record => stringifier.write(record))
    stringifier.end()
    output.on('finish', () => resolve())
  })
}

doStuff().catch(console.error)
