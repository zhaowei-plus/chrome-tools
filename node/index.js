const fs = require('fs')
let env = process.argv[2]
let envHost = 'web.jituancaiyun.net'
if (env !== 'dev') {
  env = 'pro'
  envHost = 'web.jituancaiyun.com'
}
const config = fs.readFileSync('./config.js', 'utf8')
const background = fs.readFileSync('./background.js', 'utf8')
fs.writeFileSync('./config.js', config.replace(/\/\* env \*\/'[a-z]+'/, `/* env */'${env}'`), 'utf8')
fs.writeFileSync('./background.js', background.replace(/\/\* env-host \*\/'[a-z\.]+'/, `/* env-host */'${envHost}'`), 'utf8')
