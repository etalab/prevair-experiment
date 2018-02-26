/* eslint unicorn/no-process-exit: off */
const {createWriteStream} = require('fs')
const {createGunzip} = require('zlib')
const request = require('superagent')

async function getFileURL() {
  const response = await request.get('https://www.data.gouv.fr/api/1/datasets/community_resources/21809426-f345-4965-b8e2-f4e107b83d93')
  return response.body.url
}

async function doStuff() {
  const fileURL = await getFileURL()

  await new Promise(resolve => {
    request.get(fileURL)
      .pipe(createGunzip())
      .pipe(createWriteStream('data/previsions-latest.json'))
      .on('finish', () => resolve())
  })

  console.log('Done!')
}

doStuff().catch(err => {
  console.error(err)
  process.exit(1)
})
