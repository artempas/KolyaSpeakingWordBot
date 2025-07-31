const Reverso = require('reverso-api')
const reverso = new Reverso()

reverso.getTranslation('dfgvbhjbkhjkls', 'english', 'russian').then(p=>{console.log(JSON.stringify(p))})