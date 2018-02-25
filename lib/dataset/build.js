const fs = require('fs')
const {createGzip} = require('zlib')
const {chain} = require('lodash')
const request = require('superagent')
const bluebird = require('bluebird')
const {stringify} = require('JSONStream')
const {parseDataset} = require('./parse')

const ROOT_URL = 'http://public:mdp_public@www.prevair.org/donneesmisadispo/public'

const TYPES_POLLUANTS = ['NO2', 'O3', 'PM10', 'PM25']
const TYPES_PREVISIONS = ['MAXJ0', 'MAXJ1', 'MAXJ2', 'MAXJ3', 'MOYJ0', 'MOYJ1', 'MOYJ2', 'MOYJ3']

async function getLastPeriode() {
  const response = await request.get(ROOT_URL)
  const capturedValues = chain(response.text.match(/PREVAIR\.prevision\.(20\d{6})\.MAXJ0\.O3\.public\.nc/g))
    .map(capturedValue => capturedValue.substr(18, 8))
    .uniq()
    .sortBy(capturedValue => -Number.parseInt(capturedValue, 10))
    .value()
  if (capturedValues.length === 0) throw new Error('Impossible de déterminer la dernière période')
  return capturedValues[0]
}

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

  const periode = await getLastPeriode()
  console.log('Téléchargement des données de la période ' + periode)
  const result = {metadata: {date: periode}, records: []}

  await bluebird.each(TYPES_POLLUANTS, async typePolluant => {
    return bluebird.each(TYPES_PREVISIONS, async typePrevision => {
      console.log(`Type de polluant : ${typePolluant} - Type de prévision : ${typePrevision}`)
      const variableName = getStorageKey(typePolluant, typePrevision)
      const {metadata, records} = await getParsedDataset(typePolluant, typePrevision, periode)

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

  await writeGzippedJSON(result, `data/previsions-${periode}.json.gz`)
}

function writeGzippedJSON(result, path) {
  return new Promise(resolve => {
    const output = fs.createWriteStream(path)
    const stringifier = stringify(`{"metadata":${JSON.stringify(result.metadata)},"records":[\n`, ',\n', ']}')

    stringifier
      .pipe(createGzip())
      .pipe(output)

    output.on('finish', () => resolve())

    result.records.forEach(record => stringifier.write(record))
    stringifier.end()
  })
}

doStuff().catch(console.error)
