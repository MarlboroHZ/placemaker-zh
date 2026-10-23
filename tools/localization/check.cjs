const fs = require('node:fs');
const path = require('node:path');
function load(root, locale) {
  const entries = {}, sources = {}, files = {};
  for (const file of fs.readdirSync(path.join(root, 'Lang')).filter(f => f.startsWith(locale + '.') && f.endsWith('.json')).sort()) {
    const values = JSON.parse(fs.readFileSync(path.join(root, 'Lang', file), 'utf8'));
    files[file] = values;
    for (const [key, text] of Object.entries(values)) {
      if (typeof text !== 'string') throw new Error(`${file}: ${key} is not a string`);
      (sources[key] ||= []).push({ file, text });
      entries[key] = { file, text };
    }
  }
  const conflicts = Object.entries(sources).filter(([,v]) => new Set(v.map(s => s.text)).size > 1).map(([key,definitions]) => ({key,definitions}));
  return { entries, files, conflicts };
}
const read = (file, fallback = {}) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const tokens = text => (text.match(/\{[^{}]+\}|<\/?[^>]+>/g) || []).sort().join('|');
function audit(root) {
  const en = load(root, 'en-US'), zh = load(root, 'zh-HANS');
  const dir = path.join(root, 'tools/localization');
  const reviewed = read(path.join(dir, 'reviewed.json'));
  const baseline = read(path.join(dir, 'source-baseline.json'));
  const known = read(path.join(dir, 'known-source-conflicts.json'), []);
  const allowed = read(path.join(dir, 'untranslated-allowlist.json'));
  const report = { total: Object.keys(en.entries).length, translated: 0, manuallyReviewed: 0, missing: [], changed: [], unreviewed: [], invalid: [], untranslated: [], obsolete: [], conflicts: [], knownSourceConflicts: en.conflicts.filter(c => known.some(k => JSON.stringify(k) === JSON.stringify(c))) };
  report.conflicts = [...en.conflicts.filter(c => !known.some(k => JSON.stringify(k) === JSON.stringify(c))), ...zh.conflicts];
  for (const [key, source] of Object.entries(en.entries)) {
    const target = zh.entries[key];
    if (!target || !target.text.trim()) { report.missing.push({key, ...source}); continue; }
    report.translated++;
    if (tokens(source.text) !== tokens(target.text)) report.invalid.push({key, en:source.text, zh:target.text});
    if (source.text === target.text && allowed[key] !== source.text) report.untranslated.push({key,...source});
    if (!reviewed[key] || reviewed[key].en !== source.text || reviewed[key].zh !== target.text) report.unreviewed.push(key);
    else report.manuallyReviewed++;
  }
  // Compare per-file sources as well: a shadowed duplicate may change without changing the merged dictionary.
  for (const file of new Set([...Object.keys(en.files), ...Object.keys(baseline)])) {
    const before = baseline[file] || {}, after = en.files[file] || {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)]))
      if (before[key] !== after[key]) report.changed.push({file,key,before:before[key] ?? null,after:after[key] ?? null});
  }
  report.obsolete = Object.keys(zh.entries).filter(k => !en.entries[k]);
  return { report, en, zh, reviewed };
}
function blocking(report, strictReview = false) {
  return ['missing','changed','invalid','untranslated','obsolete','conflicts'].some(k => report[k].length) || (strictReview && report.unreviewed.length > 0);
}
if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  const {report,en,zh,reviewed} = audit(root);
  if (process.argv.includes('--review')) {
    const file = process.argv[process.argv.indexOf('--review') + 1];
    const keys = read(file, null);
    if (!Array.isArray(keys)) throw new Error('Review file must be a JSON array of keys.');
    for (const key of keys) {
      if (!en.entries[key] || !zh.entries[key]?.text.trim() || report.invalid.some(i => i.key === key)) throw new Error(`Cannot review ${key}`);
      reviewed[key] = { en:en.entries[key].text, zh:zh.entries[key].text };
    }
    fs.writeFileSync(path.join(__dirname, 'reviewed.json'), JSON.stringify(reviewed,null,2)+'\n');
    console.log(`Recorded ${keys.length} reviewed keys. Run check again.`);
  } else if (process.argv.includes('--accept-source')) {
    // Accepting the current English revision does NOT mark any translation as manually reviewed.
    if (['missing','invalid','untranslated','obsolete','conflicts'].some(k=>report[k].length)) throw new Error('Fix coverage, placeholders and conflicts before accepting source.');
    fs.writeFileSync(path.join(__dirname,'source-baseline.json'),JSON.stringify(en.files,null,2)+'\n');
    console.log('Recorded current English source revision; review status unchanged.');
  } else {
    const dir = path.join(root,'.forensics/localization');
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'zh-HANS-report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k,v])=>[k,Array.isArray(v)?v.length:v])),null,2));
    console.log('unreviewed = machine-assisted translations pending individual editorial review (not missing translations).');
    console.log('Report: '+path.join(dir,'zh-HANS-report.json'));
    process.exitCode = blocking(report,process.argv.includes('--strict-review')) ? 1 : 0;
  }
}
module.exports = { load, audit, blocking };
