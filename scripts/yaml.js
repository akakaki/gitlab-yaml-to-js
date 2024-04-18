const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const yamlFile = fs.readFileSync(path.resolve(process.cwd(), process.argv.pop()), 'utf8')
const yamlObject = YAML.parse(yamlFile)

const setStringCase = (text) => {
  return text.replace(/(^.)/, (string) => string.toUpperCase())
}

const list = []
for (const [itemKey, itemValue] of Object.entries(yamlObject.paths)) {
  for (const [subKey, subValue] of Object.entries(itemValue)) {
    list.push({
      key: itemKey
        .split('/')
        .reduce((acc, cur, index) => {
          if (index === 0) acc.push(subKey)
          if (!cur || ['api', 'v0', 'v1'].includes(cur) || cur.includes('{') ) return acc
          
          return acc.concat(cur.split('-'))
        }, [])
        .map((item, index) => index ? item.replace(/(^.)/, (string) => string.toUpperCase()) : item)
        .join(''),
      label: subValue.summary,
      url: itemKey
        .replace(/^\//, '')
        .replace(/\{(.*)\}/, (string) => string.split('_').map((s, i) => i === 0 ? s : setStringCase(s)).join(''))
        .replace(/\{(.*)\}/, '${params.$1}'),
      method: subKey.toLocaleUpperCase(),
      params: subValue.description?.includes('|--|') || itemKey.includes('{'),
      data: subValue.description?.includes('|--|')
        ? subValue.description
          .split('\n')
          .reduce((acc, cur) => {
            if (!(cur.includes('|') && cur.includes('`'))) return acc
            const target = cur
              .split('|')
              .reduce((subAcc, subCur) => !subCur || !subCur.trim() ? subAcc : subAcc.concat(subCur.replace(/\`|\s|\*/g, '')), [])
            acc.push(target)
            return acc
          }, [])
          .reduce((acc, cur) => {
            return acc.concat({
              key: cur[0],
              type: cur[1] === 'int' ? 'number' : cur[1].replace(/\s|(.*)\(.*$/g, '$1'),
              label: cur[2],
              value: cur[0].split('_').map((s, i) => i === 0 ? s : setStringCase(s)).join('')
            })
          }, [])
        : null
    })    
  }
}

// 移除不需要的 API (e.g 複數或不使用的)
for (const [index, values] of Object.entries(list)) {
  if (values.key === 'getAuthzView' && !values.params) list.splice(index, 1)
}

let target = `/**\n * Coding comes from gitlab CI/CD.\n */\n\nimport request from './request.js'\n\n`
for (const item of list) {
  target += '/**\n'
  target += ` * ${item.label}\n`
  if (item.params) target += ' * @param { object } params\n'
  if (item.data) {
    for (sub of item.data) target += ` * @param { ${sub.type} } params.${sub.value} ${sub.label}\n`
  }
  if (item.url.includes('$')) target += ` * @param { string } ${item.url.replace(/^.*{(.*)}/g, '$1')} url 搜尋參數\n`
  target += ' * @returns { Promise<object> }\n'
  target += ' */\n'
  target += `export function ${item.key} (${item.params ? 'params' : ''}) {\n`
  target += '  return request({\n'
  target += `    method: '${item.method}',\n`
  target += `    url: ${item.url.includes('$') ? `\`${item.url}\`` : `'${item.url}'`},\n`
  if (item.data) {
    target += '    data: {\n'
    for (sub of item.data) {
      target += `      ${sub.key}: params.${sub.value},\n`
    }
    target += '    },\n'
  }
  target += '  })\n'
  target += '}\n\n'
}

fs.writeFileSync(path.resolve(process.cwd(), './index.js'), target)

