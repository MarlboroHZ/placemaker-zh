const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const dictionaries = {};
for (const locale of ['en-US', 'zh-HANS']) {
  dictionaries[locale] = {};
  for (const file of fs.readdirSync(path.join(root, 'Lang')).filter(f => f.startsWith(locale + '.') && f.endsWith('.json')).sort())
    Object.assign(dictionaries[locale], JSON.parse(fs.readFileSync(path.join(root, 'Lang', file), 'utf8')));
}
fs.writeFileSync(path.join(root, 'UI/src/lang/locales.generated.json'), JSON.stringify(dictionaries));
