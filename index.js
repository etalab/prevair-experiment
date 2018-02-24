const {parse} = require('querystring')
const {send} = require('micro')
const {createSpatialIndex} = require('./lib/spatial')
const {records} = require('./previsions-latest.json')

/* Micro helpers */

function extractQueryString(req) {
  const pos = req.url.indexOf('?')
  const qs = pos === -1 ? '' : req.url.substr(pos + 1)
  return parse(qs)
}

function badRequest(res, message) {
  return send(res, 400, {code: 400, message})
}

const spatialIndex = createSpatialIndex(records)

/* API */

module.exports = (req, res) => {
  const qs = extractQueryString(req)
  if (!qs.lat || !qs.lon) return badRequest(res, 'Les paramètres lat et lon sont obligatoires')
  const lat = Number.parseFloat(qs.lat)
  const lon = Number.parseFloat(qs.lon)
  if (Number.isNaN(lat) || Number.isNaN(lon) || lat >= 90 || lat <= -90 || lon >= 180 || lon <= -180) {
    return badRequest(res, 'Les paramètres lat et lon doivent être des coordonnées WGS-84 valides')
  }
  const result = spatialIndex.search({lon, lat})
  if (!result) return badRequest(res, 'Seule la France métropolitaine est couverte par cette API')
  return result
}
