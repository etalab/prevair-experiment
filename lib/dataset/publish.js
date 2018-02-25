const request = require('superagent')
const ProgressBar = require('progress')

const {DATAGOUV_API_KEY} = process.env

if (!DATAGOUV_API_KEY) {
  throw new Error('Une clé data.gouv.fr doit être fournie pour mettre à jour la ressource')
}

async function doStuff() {
  let bar

  await request.post('https://www.data.gouv.fr/api/1/datasets/community_resources/21809426-f345-4965-b8e2-f4e107b83d93/upload/')
    .set('X-API-Key', DATAGOUV_API_KEY)
    .attach('file', 'previsions-latest.json.gz', {contentType: 'application/json'})
    .on('progress', p => {
      if (p.direction === 'upload') {
        if (!bar) {
          bar = new ProgressBar('  uploading [:bar] :percent :etas', {total: p.total, complete: '#'})
        }
        bar.update(p.loaded / p.total)
      }
    })
  console.log('Done!')
}

doStuff().catch(console.error)
